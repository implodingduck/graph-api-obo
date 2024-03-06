source .env
python -m uvicorn server:app --reload --env-file .env