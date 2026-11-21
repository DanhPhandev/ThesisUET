"""Simple smoke test for the running Spring Boot API (stdlib only)."""
import json
import os
import urllib.error
import urllib.request

BASE = os.environ.get('API_URL', 'http://localhost:8080/api/v1')

def check(path):
    try:
        with urllib.request.urlopen(BASE + path, timeout=8) as response:
            body = json.loads(response.read())
            print(f'OK {response.status} GET {path} — {len(body) if isinstance(body, list) else "object"}')
            return body
    except (urllib.error.URLError, ValueError) as exc:
        print(f'FAIL {path}: {exc}')
        raise

if __name__ == '__main__':
    check('/languages')
    check('/tags')
    check('/problems')
    check('/contests')
    check('/leaderboard')
    print('Public API smoke tests passed. Test auth, submissions and Judge0 separately.')
