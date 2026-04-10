from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes import auth, users, lowiska, dashboard
from database import engine, Base
import models

app = FastAPI(title="Fish Track Pro API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "http://frontend:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(lowiska.router)
app.include_router(dashboard.router)

@app.on_event("startup")
async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)