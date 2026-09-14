from fastapi import FastAPI

app = FastAPI(
    title='Nexora Whatspp ai service',
    version = "1.0.0"
)

@app.get('/health')
def health_check():
    return{
        'success':True,
        "message":'AI service is running'
    }