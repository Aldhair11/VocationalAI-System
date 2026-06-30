from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_health_check_endpoint():
    """Prueba unitaria para verificar que el motor de IA responde correctamente."""
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}

def test_root_endpoint():
    """Prueba unitaria para el estado de vigilia de la IA."""
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {"status": "IA Awake and Ready"}