from fastapi import FastAPI, Query, Header, Request
from fastapi.middleware.cors import CORSMiddleware
import json
from typing import Union
from fastapi.staticfiles import StaticFiles
from starlette.responses import FileResponse, JSONResponse
from pydantic_settings import BaseSettings, SettingsConfigDict
import os
import jwt 
import requests
from cryptography.hazmat.primitives import serialization


class Settings(BaseSettings):
    model_config = SettingsConfigDict()
    CLIENT_ID: str
    CLIENT_SECRET: str
    TENANT_ID: str


settings = Settings()

app = FastAPI(
    title="Graph API OBO",
)

jwt_keys = {}

@app.on_event("startup")
async def startup_event():
    print("Starting up")
    #print(f"https://login.microsoftonline.com/{settings.TENANT_ID}/discovery/keys")
    response = requests.get(f"https://login.microsoftonline.com/{settings.TENANT_ID}/discovery/keys")
    
    keys = response.json()['keys']
    for k in keys:
        #print(k)
        rsa_pem_key = jwt.algorithms.RSAAlgorithm.from_jwk(json.dumps(k))
        rsa_pem_key_bytes = rsa_pem_key.public_bytes(
          encoding=serialization.Encoding.PEM, 
          format=serialization.PublicFormat.SubjectPublicKeyInfo
        )
        #print(rsa_pem_key_bytes)
        jwt_keys[k['kid']] = rsa_pem_key_bytes
        #print("-------------")


app.add_middleware(
    CORSMiddleware,
    allow_origins=['*'],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/assets", StaticFiles(directory="../frontend/dist/assets"), name="assets")
app.mount("/static", StaticFiles(directory="../frontend/dist/static"), name="static")

exempt_paths = ["/assets", "/static", "/hello", "/favicon.ico"]
def is_path_exempt(request: Request):
    path = request.url.path
    method = request.method
    if path == "/" or method == "OPTIONS":
        return True
    for exempt_path in exempt_paths:
        if path.startswith(exempt_path):
            return True
    return False

@app.middleware('http')
async def validate_jwt_token(request: Request, call_next):
    
    print(request.url.path)

    if not is_path_exempt(request):
        auth_header = request.headers.get('Authorization')
        if not auth_header:
            return JSONResponse(status_code=401, content={"message": "Not authenticated"})
        try:
            token = auth_header.split(' ')[1]
            #print(token)
            #print(settings.CLIENT_ID)
            alg = jwt.get_unverified_header(token)['alg']
            kid = jwt.get_unverified_header(token)['kid']
            claims = jwt.decode(token,key=jwt_keys[kid], algorithms=[alg], audience=[settings.CLIENT_ID])
            request.state.claims = claims
            request.state.access_token = token
        except Exception as e:
            return JSONResponse(status_code=401, content={"message": f"Error: {e}"})
    response = await call_next(request)
    return response

@app.get("/")
async def index():
    return FileResponse('../frontend/dist/index.html')

@app.get(
    "/hello",
    tags=["APIs"],
    response_model=dict,
)
async def hello(prompt: Union[str, None] = Query(default="world", max_length=50)):
    return {"message": f"Hello, {prompt}!"}


@app.get(
    "/secure",
    tags=["secure"],
    response_model=dict,
)
async def secure(request: Request, prompt: Union[str, None] = Query(default="world", max_length=50)):
    claims = request.state.claims
    return {"message": f"Hello from Secure, {prompt}!", "claims": claims}

@app.get(
    "/graph",
    tags=["secure"],
    response_model=dict,
)
async def graphsearch(request: Request, prompt: Union[str, None] = Query(default="world", max_length=50)):
    access_token = request.state.access_token
    tokenresp = requests.post(f"https://login.microsoftonline.com/{settings.TENANT_ID}/oauth2/v2.0/token", data={
        "grant_type": "urn:ietf:params:oauth:grant-type:jwt-bearer",
        "client_id": settings.CLIENT_ID,
        "client_secret": settings.CLIENT_SECRET,
        "assertion": access_token,
        "scope": "https://graph.microsoft.com/.default",
        "requested_token_use": "on_behalf_of",
    })
    tokenresp_json = tokenresp.json()

    headers = {
        "Authorization": f"Bearer {tokenresp_json['access_token']}"
    }
    search_body = {
        "requests": [
            {
                "entityTypes": [
                    "driveItem", "listItem", "list", "site", "drive"
                ],
                "query": {
                    "queryString": prompt
                },
            }
        ],
    }

    resp = requests.post("https://graph.microsoft.com/v1.0/search/query", json=search_body, headers=headers)
    
    return {"message": f"Hello from Graph, {prompt}!", "resp": resp.json() }