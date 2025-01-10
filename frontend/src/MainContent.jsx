
import { useState, useEffect } from 'react'
import { MsalProvider, AuthenticatedTemplate, useMsal, UnauthenticatedTemplate } from '@azure/msal-react';
import { loginRequest, silentRequest } from './authConfig';
import JsonView from '@uiw/react-json-view';
import { json } from 'react-router-dom';

const MainContent = () => {
    const { instance } = useMsal();
    const activeAccount = instance.getActiveAccount();

    const searchsample = {
        "requests": [
            {
                "entityTypes": [
                    "driveItem", "listItem", "list", "site", "drive"
                ],
                "query": {
                    "queryString": "bagels"
                },
            }
        ],
    }

    const [bearerToken, setBearerToken] = useState("")
    const [securename, setSecurename] = useState("")
    const [secureresponse, setSecureresponse] = useState("")
    const [graphresponse, setGraphresponse] = useState("{}")
    const [genericpath, setGenericpath] = useState("search/query")
    const [genericmethod, setGenericmethod] = useState("POST")
    const [genericbody, setGenericbody] = useState(JSON.stringify(searchsample))

    


    const handleLoginRedirect = () => {
        instance.loginRedirect(loginRequest).catch((error) => console.log(error));
    };

    const handleLogoutRedirect = () => {
        instance.logoutRedirect().catch((error) => console.log(error));
    };

    const handleGenerateBearerToken = async () => {
        await generateBearerToken();
    }

    const generateBearerToken = async () => {
        const response = await instance.acquireTokenSilent({
            ...silentRequest,
            account: activeAccount
        });
        console.log(response)
        let accessToken = response.accessToken;   
        setBearerToken(accessToken)
        return accessToken;
    }

    const handleCallSecure = async () => {
        let bearerToken = await generateBearerToken();
        const response = await fetch(`http://localhost:8888/secure?prompt=${securename}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'authorization': `Bearer ${bearerToken}`
            }
        });
        setSecureresponse(await response.text());
    }

    const handleCallGraph = async () => {
        let bearerToken = await generateBearerToken();
        const response = await fetch(`http://localhost:8888/graph?prompt=${securename}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'authorization': `Bearer ${bearerToken}`
            }
        });
        setGraphresponse(await response.text());
    }

    const handleCallGeneric = async() => {
        let bearerToken = await generateBearerToken();
        const response = await fetch(`http://localhost:8888/generic`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'authorization': `Bearer ${bearerToken}`
            },
            body: JSON.stringify({
                method: genericmethod,
                path: genericpath,
                body: genericbody
            })
        });
        setGraphresponse(await response.text());
    }

    return (
        <div className="App">
            <AuthenticatedTemplate>
                {activeAccount ? (
                    <>
                    <div>Hello, {activeAccount.name}</div>
                    <button onClick={handleGenerateBearerToken}>Generate Bearer token</button>
                    <pre>{bearerToken}</pre>
                    <hr />
                    {/* <input type="text" placeholder='enter a name' value={securename} onChange={(e) => { setSecurename(e.target.value)}} />
                    <button onClick={handleCallSecure}>Call Secure</button>
                    <button onClick={handleCallGraph}>Call Graph</button>
                    <pre>{JSON.stringify(secureresponse, null, 2)}</pre> */}
                    
                    <hr />
                    
                    <button className="signOutButton" onClick={handleLogoutRedirect} variant="primary">Sign out</button>
                    <pre>{ JSON.stringify(activeAccount.idTokenClaims, null, 2) }</pre>
                    <hr /> 
                    <fieldset>
                        <legend>Generic...</legend>
                        <input type="text" placeholder='enter a method' value={genericmethod} onChange={(e) => { setGenericmethod(e.target.value)}} />
                        <input type="text" placeholder='enter a path' value={genericpath} onChange={(e) => { setGenericpath(e.target.value)}} />
                        <br />
                        <textarea onChange={(e) => { setGenericbody(e.target.value)}}>
                            {genericbody}
                        </textarea>
                        <button onClick={handleCallGeneric} variant="primary">Call!</button>
                    </fieldset>
                    <div className='jsonresponse'>
                        <JsonView value={JSON.parse(graphresponse)} />
                    </div>
                    </>
                ) : null}
            </AuthenticatedTemplate>
            <UnauthenticatedTemplate>
                <button className="signInButton" onClick={handleLoginRedirect} variant="primary">
                    Sign up
                </button>
            </UnauthenticatedTemplate>
        </div>
    );
}

export default MainContent;