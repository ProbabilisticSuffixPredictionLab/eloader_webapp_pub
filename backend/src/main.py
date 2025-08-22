from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

from routes.el_preprocess_routes import router as el_router

app = FastAPI(title="Event Log Encoder Backend")

origins = [
    "",
    "http://localhost:3000"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(el_router)

# Main root
@app.get("/")
async def root():
    return {"message": "Application started"}

# Start localhost
if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, log_level="debug")