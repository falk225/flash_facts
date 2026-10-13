from flask.testing import FlaskClient


def test_health(client: FlaskClient) -> None:
    resp = client.get("/api/health")

    assert resp.status_code == 200
    assert resp.get_json() == {"status": "ok"}


def test_serves_frontend_pages(client: FlaskClient) -> None:
    for path in ("/", "/session.html", "/config.html", "/stats.html", "/js/deck.js", "/css/base.css"):
        assert client.get(path).status_code == 200, path


def test_missing_static_file_is_404(client: FlaskClient) -> None:
    assert client.get("/nope.html").status_code == 404


def test_static_route_cannot_escape_frontend_dir(client: FlaskClient) -> None:
    for path in ("/../backend/app.py", "/%2e%2e/backend/app.py", "/..%2fbackend/app.py", "/..%2fdata/users.json"):
        resp = client.get(path)
        assert resp.status_code == 404, path
        assert b"Flask" not in resp.data
