"""
SocialIQ end-to-end API test suite (standard library only).

Exercises the running Node API (and the Flask ML service behind it) the way the
frontend does: auth, posts, CSV upload, analytics, insights, prediction,
compare, security and cross-page data consistency. Analytics numbers are
re-computed independently here from the raw posts and compared.

PREREQUISITES
  - MongoDB running; use a THROWAWAY database (the suite creates users/posts)
  - Flask ML service:  cd analytics && ./venv/bin/python app.py
  - Node API:          cd backend && PORT=5050 JWT_SECRET=<32+ chars> \\
                         MONGODB_URI=mongodb://localhost:27017/socialiq_test node server.js

RUN
  JWT_SECRET=<same secret> python3 tests/api_test.py

ENVIRONMENT
  API_URL      default http://localhost:5050/api
  ML_URL       default http://127.0.0.1:5002
  JWT_SECRET   needed for crafted-token checks (skipped if unset)
  MONGO_DB     database name; enables the password-hash check via mongosh
  SKIP_RATE_LIMIT=1  skip the failed-login throttling check (only locks its own test email)

Exit code is 0 only if every check passes.
"""

import base64
import csv
import hashlib
import hmac
import io
import json
import math
import os
import shutil
import statistics
import subprocess
import sys
import time
import urllib.error
import urllib.request
import uuid
from collections import Counter, defaultdict
from datetime import date

API = os.environ.get('API_URL', 'http://localhost:5050/api')
ML = os.environ.get('ML_URL', 'http://127.0.0.1:5002')
SECRET = os.environ.get('JWT_SECRET', '')
MONGO_DB = os.environ.get('MONGO_DB', '')
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATASET = os.path.join(ROOT, 'analytics', 'data', 'synthetic_training_data.csv')
RUN = uuid.uuid4().hex[:8]  # unique suffix so the suite can be re-run against the same DB

passed, failed = 0, []


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def section(name):
    print(f'\n== {name}')


def check(name, cond, detail=''):
    global passed
    if cond:
        passed += 1
        print(f'PASS {name}' + (f'  [{detail}]' if detail else ''))
    else:
        failed.append(name)
        print(f'FAIL {name}' + (f'  [{detail}]' if detail else ''))


def req(method, path, body=None, token=None, raw=None, ctype='application/json', headers=None, base=None):
    data = raw if raw is not None else (json.dumps(body).encode() if body is not None else None)
    r = urllib.request.Request((base or API) + path, data=data, method=method)
    if data is not None:
        r.add_header('Content-Type', ctype)
    if token:
        r.add_header('Authorization', 'Bearer ' + token)
    for k, v in (headers or {}).items():
        r.add_header(k, v)
    try:
        with urllib.request.urlopen(r, timeout=120) as resp:
            return resp.status, json.loads(resp.read() or b'{}'), dict(resp.headers)
    except urllib.error.HTTPError as e:
        text = e.read()
        try:
            payload = json.loads(text or b'{}')
        except ValueError:
            payload = {'_raw': text[:300].decode(errors='replace')}
        return e.code, payload, dict(e.headers)


def upload(token, content, filename='data.csv', field='file', extra_file=False):
    boundary = uuid.uuid4().hex
    parts = [(field, filename, content)] + ([('file', 'second.csv', b'a')] if extra_file else [])
    body = b''.join(
        f'--{boundary}\r\nContent-Disposition: form-data; name="{f}"; filename="{n}"\r\n'
        f'Content-Type: text/csv\r\n\r\n'.encode() + c + b'\r\n'
        for f, n, c in parts
    ) + f'--{boundary}--\r\n'.encode()
    return req('POST', '/upload/csv', raw=body, token=token, ctype=f'multipart/form-data; boundary={boundary}')


def b64url(data):
    return base64.urlsafe_b64encode(data).rstrip(b'=').decode()


def make_jwt(payload, secret, alg='HS256', exp_offset=3600):
    """HS256/HS512 JWT without third-party libraries (for crafted-token checks)."""
    now = int(time.time())
    claims = {'iat': now, 'exp': now + exp_offset, **payload}
    head = b64url(json.dumps({'alg': alg, 'typ': 'JWT'}).encode())
    body = b64url(json.dumps(claims).encode())
    digest = {'HS256': hashlib.sha256, 'HS512': hashlib.sha512}[alg]
    sig = hmac.new(secret.encode(), f'{head}.{body}'.encode(), digest).digest()
    return f'{head}.{body}.{b64url(sig)}'


def register(name):
    email = f'{name.lower()}-{RUN}@example.test'
    st, r, _ = req('POST', '/auth/register', {'name': name, 'email': email, 'password': f'{name}-pass-123'})
    assert st == 201, f'register failed: {st} {r}'
    return r['token'], r['user'], email


HEADER = ('post_id,date,platform,content_type,category,caption_length,hashtags_count,'
          'duration_seconds,posting_hour,views,likes,comments,shares,saves,reach\n')


def csv_row(pid, date_='2026-11-10', platform='Instagram', hour='19', views='1000', reach='800',
            content_type='Reel', category='Travel', likes='50'):
    return f'{pid},{date_},{platform},{content_type},{category},100,5,30,{hour},{views},{likes},5,3,2,{reach}\n'


def dataset_csv(limit=150):
    """First `limit` rows of the synthetic dataset, restricted to the upload columns."""
    with open(DATASET, newline='') as f:
        reader = csv.DictReader(f)
        cols = HEADER.strip().split(',')
        out = io.StringIO()
        writer = csv.DictWriter(out, fieldnames=cols, extrasaction='ignore', lineterminator='\n')
        writer.writeheader()
        for i, row in enumerate(reader):
            if i >= limit:
                break
            writer.writerow(row)
    return out.getvalue().encode()


def pearson(xs, ys):
    mx, my = statistics.fmean(xs), statistics.fmean(ys)
    sx = math.sqrt(sum((x - mx) ** 2 for x in xs))
    sy = math.sqrt(sum((y - my) ** 2 for y in ys))
    return sum((x - mx) * (y - my) for x, y in zip(xs, ys)) / (sx * sy) if sx and sy else 0.0


def close(a, b, tol=0.011):
    return abs(float(a) - float(b)) <= tol


# ---------------------------------------------------------------------------
# Suites
# ---------------------------------------------------------------------------
def test_health():
    section('SERVICES')
    st, r, _ = req('GET', '/health')
    check('Node API health', st == 200 and r.get('status') == 'ok')
    st, r, _ = req('GET', '/health', base=ML)
    check('Flask ML health, model loaded', st == 200 and r.get('modelLoaded') is True)


def test_auth():
    section('AUTH')
    token, user, email = register('AuthUser')
    check('Register returns token and user without password', bool(token) and 'password' not in json.dumps(user))
    st, r, _ = req('POST', '/auth/register', {'name': 'Dup', 'email': email.upper(), 'password': 'another-pass'})
    check('Duplicate email (case-insensitive) rejected', st == 400 and 'exists' in r.get('error', ''), r.get('error'))
    st, r, _ = req('POST', '/auth/login', {'email': email, 'password': 'AuthUser-pass-123'})
    check('Login with valid credentials', st == 200 and r.get('token'))
    st, r, _ = req('POST', '/auth/login', {'email': email, 'password': 'wrong-password'})
    check('Invalid password -> 401 generic message', st == 401 and r.get('error') == 'Invalid email or password')
    st, r, _ = req('POST', '/auth/login', {'email': f'nobody-{RUN}@example.test', 'password': 'whatever1'})
    check('Unknown email -> same generic message', st == 401 and r.get('error') == 'Invalid email or password')
    for body, label in [({}, 'empty body'), ({'email': email}, 'missing password'),
                        ({'email': {'$gt': ''}, 'password': {'$gt': ''}}, 'operator objects')]:
        check(f'Login with {label} -> 400', req('POST', '/auth/login', body)[0] == 400)
    for body, label in [({'name': 'x', 'email': 'not-an-email', 'password': 'abcdefg'}, 'invalid email'),
                        ({'name': 'x', 'email': f'short-{RUN}@example.test', 'password': '123'}, 'short password'),
                        ({'name': '', 'email': f'noname-{RUN}@example.test', 'password': 'abcdefg'}, 'empty name')]:
        check(f'Register with {label} -> 400', req('POST', '/auth/register', body)[0] == 400)
    st, me, _ = req('GET', '/auth/me', token=token)
    check('GET /auth/me returns current user', st == 200 and me['user']['email'] == email)

    for method, path in [('GET', '/posts'), ('POST', '/posts'), ('GET', '/analytics'),
                         ('GET', '/analytics/insights'), ('GET', '/analytics/compare'),
                         ('POST', '/prediction'), ('GET', '/auth/me'), ('PUT', '/auth/me'), ('DELETE', '/posts')]:
        check(f'{method} {path} without token -> 401', req(method, path, {} if method != 'GET' else None)[0] == 401)
    check('Upload without token -> 401', upload(None, (HEADER + csv_row('X1')).encode())[0] == 401)
    check('Garbage token -> 401', req('GET', '/posts', token='abc.def.ghi')[0] == 401)
    payload = b64url(json.dumps({'id': user['_id']}).encode())
    check('alg=none token -> 401', req('GET', '/posts', token=f"{b64url(b'{\"alg\":\"none\"}')}.{payload}.")[0] == 401)
    check('Token signed with another secret -> 401',
          req('GET', '/posts', token=make_jwt({'id': user['_id']}, 'x' * 48))[0] == 401)
    if SECRET:
        check('Token signed with the real secret works', req('GET', '/posts', token=make_jwt({'id': user['_id']}, SECRET))[0] == 200)
        st, r, _ = req('GET', '/posts', token=make_jwt({'id': user['_id']}, SECRET, exp_offset=-60))
        check('Expired token -> 401 "Session expired"', st == 401 and 'expired' in r.get('error', '').lower(), r.get('error'))
        check('HS512 token rejected (algorithm pinned)',
              req('GET', '/posts', token=make_jwt({'id': user['_id']}, SECRET, alg='HS512'))[0] == 401)
        check('Token for nonexistent user -> 401',
              req('GET', '/posts', token=make_jwt({'id': '0123456789abcdef01234567'}, SECRET))[0] == 401)
    else:
        print('SKIP crafted-token checks (JWT_SECRET not set)')
    if MONGO_DB and shutil.which('mongosh'):
        h = subprocess.check_output(['mongosh', '--quiet', MONGO_DB, '--eval',
                                     f"db.users.findOne({{email:'{email}'}}).password"]).decode().strip()
        check('Password stored as bcrypt hash', h.startswith('$2') and 'AuthUser-pass-123' not in h, h[:7] + '…')

    st, r, _ = req('PUT', '/auth/me', {'name': 'Auth Renamed'}, token)
    check('Profile update', st == 200 and r['user']['name'] == 'Auth Renamed')
    st, r, _ = req('PUT', '/auth/me', {'email': 'bad'}, token)
    check('Profile update rejects invalid email', st == 400)


def test_posts():
    section('POSTS')
    ta, ua, _ = register('PostsA')
    tb, _, _ = register('PostsB')
    st, r, _ = req('GET', '/posts', token=ta)
    check('Empty workspace lists 0 posts', st == 200 and r['count'] == 0 and r['data'] == [])
    base = {'date': '2026-11-10', 'platform': 'Instagram', 'contentType': 'Reel', 'category': 'Travel',
            'postingHour': 19, 'views': 1000, 'likes': 40, 'comments': 5, 'shares': 3, 'saves': 2, 'reach': 800}
    st, c, _ = req('POST', '/posts', {**base, 'postId': 'PA1'}, ta)
    check('Create post', st == 201 and c['data']['postId'] == 'PA1')
    check('Engagement rate = (likes+comments+shares+saves)/reach*100', c['data']['engagementRate'] == 6.25)
    pid = c['data']['_id']
    check('Read by _id', req('GET', f'/posts/{pid}', token=ta)[1]['data']['postId'] == 'PA1')
    check('Read by postId', req('GET', '/posts/PA1', token=ta)[1]['data']['_id'] == pid)
    st, u, _ = req('PUT', f'/posts/{pid}', {'reach': 500, 'category': 'Finance', 'date': '2026-11-12'}, ta)
    check('Update recalculates engagement rate', st == 200 and u['data']['engagementRate'] == 10.0)
    check('Update changes category and date', u['data']['category'] == 'Finance' and u['data']['date'].startswith('2026-11-12'))
    st, n, _ = req('POST', '/posts', {**base, 'reach': 0}, ta)
    check('No reach -> engagement rate 0 (never estimated)', st == 201 and n['data']['engagementRate'] == 0)
    check('Auto-generated postId', n['data']['postId'].startswith('P'))

    invalid = [
        ('missing category', {k: v for k, v in base.items() if k != 'category'}),
        ('postingHour 24', {**base, 'postingHour': 24}),
        ('postingHour -1', {**base, 'postingHour': -1}),
        ('postingHour ""', {**base, 'postingHour': ''}),
        ('negative views', {**base, 'views': -10}),
        ('non-numeric likes', {**base, 'likes': 'many'}),
        ('Infinity reach', {**base, 'reach': 'Infinity'}),
        ('impossible date', {**base, 'date': '2026-02-30'}),
        ('unknown platform', {**base, 'platform': 'MySpace'}),
        ('unknown content type', {**base, 'contentType': 'Story'}),
        ('category too long', {**base, 'category': 'c' * 51}),
        ('duplicate postId', {**base, 'postId': 'PA1'}),
    ]
    for label, body in invalid:
        st, r, _ = req('POST', '/posts', body, ta)
        check(f'Create rejects {label} -> 400', st == 400, r.get('error'))
    check('Update rejects invalid hour', req('PUT', f'/posts/{pid}', {'postingHour': 30}, ta)[0] == 400)
    check('Update rejects negative metric', req('PUT', f'/posts/{pid}', {'saves': -1}, ta)[0] == 400)
    check('Unknown id -> 404', req('GET', '/posts/does-not-exist', token=ta)[0] == 404)

    check('User B cannot read A post', req('GET', f'/posts/{pid}', token=tb)[0] == 404)
    check('User B cannot update A post', req('PUT', f'/posts/{pid}', {'views': 1}, tb)[0] == 404)
    check('User B cannot delete A post', req('DELETE', f'/posts/{pid}', token=tb)[0] == 404)
    check('User B list excludes A posts', req('GET', '/posts', token=tb)[1]['count'] == 0)
    st, r, _ = req('PUT', f'/posts/{pid}', {'userId': '0123456789abcdef01234567', 'views': 5}, ta)
    check('userId in body cannot reassign ownership', r['data']['userId'] == ua['_id'])

    st, r, _ = req('GET', '/posts?platform=Instagram&sort=-views', token=ta)
    check('Filter + sort', st == 200 and all(p['platform'] == 'Instagram' for p in r['data']))
    check('Search with regex characters is safe', req('GET', '/posts?search=(*', token=ta)[0] == 200)
    check('Array query parameter rejected', req('GET', '/posts?platform=a&platform=b', token=ta)[0] == 400)
    st, d, _ = req('DELETE', f'/posts/{pid}', token=ta)
    check('Delete post', st == 200 and req('GET', f'/posts/{pid}', token=ta)[0] == 404)
    check('Bulk delete requires confirm=DELETE', req('DELETE', '/posts', token=ta)[0] == 400)
    st, r, _ = req('DELETE', '/posts?confirm=DELETE', token=ta)
    check('Bulk delete removes only own posts', st == 200 and req('GET', '/posts', token=ta)[1]['count'] == 0)


def test_csv():
    section('CSV UPLOAD')
    token, _, _ = register('CsvUser')
    st, r, _ = upload(token, dataset_csv(60))
    check('Valid CSV imports rows', st == 200 and r['importedRows'] > 0, f"{r.get('importedRows')} imported / {r.get('invalidRows')} invalid")
    check('Import counts are consistent', r['totalRows'] == r['validRows'] + r['invalidRows'] and r['importedRows'] == r['validRows'])
    check('Preview returns up to 10 rows', 0 < len(r['preview']) <= 10)
    check('Imported posts appear in Posts', req('GET', '/posts', token=token)[1]['count'] == r['importedRows'])

    check('Non-.csv file -> 400', upload(token, (HEADER + csv_row('T1')).encode(), filename='data.xlsx')[0] == 400)
    check('Empty file -> 400', upload(token, b'')[0] == 400)
    check('Header only -> 400', upload(token, HEADER.encode())[0] == 400)
    check('Binary content -> 400', upload(token, b'\x00\x01\x02post_id')[0] == 400)
    st, r, _ = upload(token, b'post_id,date,platform\nP1,2026-11-10,Instagram\n')
    check('Missing columns -> 400 naming them', st == 400 and 'reach' in r.get('missingColumns', []))
    check('Wrong form field -> 400', upload(token, (HEADER + csv_row('T1')).encode(), field='upload')[0] == 400)
    st, r, _ = upload(token, ('﻿' + HEADER + csv_row(f'BOM{RUN}')).encode('utf-8'))
    check('Excel BOM accepted', st == 200 and r['importedRows'] == 1)

    rows = (csv_row('D1') + csv_row('D1') + csv_row(f'BOM{RUN}')
            + csv_row('N1', views='-5') + csv_row('N2', views='abc') + csv_row('N3', reach='Infinity')
            + csv_row('DT1', date_='2026-02-30') + csv_row('DT2', date_='20/11/2026') + csv_row('DT3', date_='')
            + csv_row('H1', hour='24') + csv_row('H2', hour='7.5')
            + csv_row('PL1', platform='MySpace') + csv_row('CT1', content_type='Story')
            + 'SHORT,2026-11-10\n'
            + '"Q1","2026-11-10","Instagram","Reel","Travel, Food",100,5,30,19,1000,50,5,3,2,800\n'
            + csv_row('OK1'))
    st, r, _ = upload(token, (HEADER + rows).encode())
    errs = {e['postId']: ' '.join(e['errors']) for e in r.get('errors', [])}
    check('Malformed CSV still processed (no 500)', st == 200)
    check('Duplicate post_id within CSV', 'Duplicate post_id' in errs.get('D1', ''))
    check('Duplicate post_id against database', 'already exists' in errs.get(f'BOM{RUN}', ''))
    check('Negative metric', 'cannot be negative' in errs.get('N1', ''))
    check('Non-numeric metric', 'must be a number' in errs.get('N2', ''))
    check('Infinity metric', 'must be a number' in errs.get('N3', ''))
    check('Impossible date', 'Invalid date' in errs.get('DT1', ''))
    check('Wrong date format', 'Invalid date' in errs.get('DT2', ''))
    check('Missing date', 'Missing date' in errs.get('DT3', ''))
    check('posting_hour out of range', 'posting_hour' in errs.get('H1', ''))
    check('posting_hour not an integer', 'posting_hour' in errs.get('H2', ''))
    check('Invalid platform', 'Invalid platform' in errs.get('PL1', ''))
    check('Invalid content type', 'Invalid content_type' in errs.get('CT1', ''))
    check('Short (malformed) row rejected', 'SHORT' in errs)
    imported = {p['postId']: p for p in req('GET', '/posts', token=token)[1]['data']}
    check('Quoted field with comma imported intact', imported.get('Q1', {}).get('category') == 'Travel, Food')
    check('Valid row imported alongside invalid rows', 'OK1' in imported and 'D1' in imported)

    st, r, _ = upload(token, (HEADER + csv_row('U0') + '"UNTERMINATED,2026-11-10,Instagram\n' + csv_row('U1')).encode())
    check('Unterminated quote -> 400 naming the line (no rows silently swallowed)',
          st == 400 and 'line 3' in r.get('error', ''), r.get('error'))

    st, r, _ = upload(token, (HEADER + ''.join(csv_row(f'M{i}', views='-1') for i in range(250))).encode())
    check('Excessive invalid rows: errors capped at 200 and flagged',
          st == 200 and r['invalidRows'] == 250 and len(r['errors']) == 200 and r['errorsTruncated'])
    check('More than 10,000 rows -> 400',
          upload(token, (HEADER + ''.join(csv_row(f'L{i}') for i in range(10001))).encode())[0] == 400)


def load_dataset_user():
    token, _, _ = register('AnalyticsUser')
    st, up, _ = upload(token, dataset_csv(150))
    assert st == 200 and up['importedRows'] > 100, up
    posts = req('GET', '/posts', token=token)[1]['data']
    return token, posts


def test_analytics(token, posts):
    section('ANALYTICS (re-computed independently)')
    st, an, _ = req('GET', '/analytics', token=token)
    check('Analytics loads', st == 200 and not an['isEmpty'])
    k = an['kpis']
    n = len(posts)
    check('KPI total posts', k['total_posts'] == n == an['totalPosts'] == an['datasetPosts'], str(n))
    for key, field in [('total_views', 'views'), ('total_reach', 'reach'), ('total_likes', 'likes'),
                       ('total_comments', 'comments'), ('total_shares', 'shares'), ('total_saves', 'saves')]:
        check(f'KPI {key}', k[key] == sum(p[field] for p in posts))
    check('KPI average views', close(k['average_views'], statistics.fmean(p['views'] for p in posts), 0.01))
    check('KPI average engagement rate', close(k['average_engagement_rate'], statistics.fmean(p['engagementRate'] for p in posts)))
    cards = {c['label']: c for c in an['overviewKpiCards']}
    check('Dashboard shows the 5 KPI cards',
          list(cards) == ['TOTAL POSTS', 'TOTAL VIEWS', 'TOTAL REACH', 'ENGAGEMENT RATE', 'PERFORMANCE SCORE'])
    check('Dashboard cards carry no fabricated deltas', all('delta' not in c for c in cards.values()))
    check('Engagement card matches KPI', cards['ENGAGEMENT RATE']['value'] == f"{k['average_engagement_rate']:.2f}%")

    # Descriptive statistics (pandas std is the sample standard deviation)
    stats_rows = {r['metric']: r for r in an['descriptiveStats']}
    views = [p['views'] for p in posts]
    v = stats_rows['Views']
    check('Descriptive: views mean', v['mean'] == f'{statistics.fmean(views):,.1f}', v['mean'])
    check('Descriptive: views median', v['median'] == f'{statistics.median(views):,.1f}', v['median'])
    check('Descriptive: views std (sample)', v['std'] == f'{statistics.stdev(views):,.1f}', v['std'])
    check('Descriptive: views min/max', v['min'] == f'{min(views):,.0f}' and v['max'] == f'{max(views):,.0f}')
    check('Descriptive: 7 metrics', len(stats_rows) == 7)

    # Trends: daily sums
    by_day = defaultdict(int)
    for p in posts:
        by_day[p['date'][:10]] += p['views']
    ts = {row['full_date']: row for row in an['timeSeries']}
    check('Trend has one point per publish day', set(ts) == set(by_day), f'{len(ts)} days')
    check('Trend daily views match', all(ts[d]['views'] == v for d, v in by_day.items()))
    check('Trend sorted by date', list(ts) == sorted(ts))

    # Content type / category (formatted) and platform (raw)
    type_counts = Counter(p['contentType'] for p in posts)
    content = {row['format']: row for row in an['contentAnalysis']}
    check('Content analysis covers every type', set(content) == set(type_counts))
    check('Content analysis post counts', all(content[t]['count'] == c for t, c in type_counts.items()))
    for t in type_counts:
        er = statistics.fmean(p['engagementRate'] for p in posts if p['contentType'] == t)
        if not close(float(content[t]['avgEng'].rstrip('%')), er):
            check(f'Content analysis ER for {t}', False, f"{content[t]['avgEng']} vs {er:.2f}")
            break
    else:
        check('Content analysis average engagement rates', True)
    cat_counts = Counter(p['category'] for p in posts)
    check('Category analysis covers every category', {r['category'] for r in an['categoryAnalysis']} == set(cat_counts))
    plat = {r['platform']: r for r in an['platformAnalysis']}
    check('Platform analysis counts', all(plat[pl]['post_count'] == c for pl, c in Counter(p['platform'] for p in posts).items()))
    check('Platform analysis average views',
          all(close(plat[pl]['average_views'], statistics.fmean(p['views'] for p in posts if p['platform'] == pl), 0.01) for pl in plat))

    # Day analysis (day of week from the stored date)
    day_counts = Counter(date.fromisoformat(p['date'][:10]).strftime('%a') for p in posts)
    days = {r['day']: r for r in an['dayAnalysis']}
    check('Day analysis has 7 days', list(days) == ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'])
    check('Day analysis counts', all(days[d]['count'] == day_counts.get(d, 0) for d in days))
    check('Days with no posts have no bar', all(r['height'] == '0%' for r in days.values() if r['count'] == 0))
    check('Peak day is the busiest day', all(r['isPeak'] == (r['count'] == max(day_counts.values())) for r in days.values()))

    # Hour analysis (Day × hour-window heatmap)
    hm = an['heatmapMatrix']
    check('Heatmap is 7 days × 7 hour windows', len(hm) == 7 and all(len(r) == 7 for r in hm))
    check('Heatmap levels within 0–3', all(0 <= c <= 3 for r in hm for c in r))
    windows = [range(6, 9), range(9, 12), range(12, 15), range(15, 18), range(18, 21), range(21, 24), range(0, 6)]
    day_names = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    empty_cells = [(d, w) for d in range(7) for w in range(7)
                   if not any(date.fromisoformat(p['date'][:10]).strftime('%A') == day_names[d]
                              and p['postingHour'] in windows[w] for p in posts)]
    check('Heatmap cells with no posts are level 0', all(hm[d][w] == 0 for d, w in empty_cells), f'{len(empty_cells)} empty cells')

    # Correlations
    corr = {r['metric']: r for r in an['correlationMatrix']}
    expected = pearson([p['views'] for p in posts], [p['likes'] for p in posts])
    check('Correlation views↔likes', close(corr['Views']['likes'], expected, 0.011), f"{corr['Views']['likes']} vs {expected:.2f}")
    check('Correlation matrix diagonal = 1', all(corr[m][key] == '1.00' for m, key in [('Views', 'views'), ('Likes', 'likes'), ('Reach', 'reach')]))
    check('Correlation matrix symmetric', corr['Views']['shares'] == corr['Shares']['views'])

    # Filters
    platform = posts[0]['platform']
    st, f, _ = req('GET', f'/analytics?platform={urllib.request.quote(platform)}', token=token)
    check('Platform filter', f['totalPosts'] == sum(1 for p in posts if p['platform'] == platform))
    ctype = posts[0]['contentType']
    st, f, _ = req('GET', f'/analytics?contentType={ctype}', token=token)
    check('Content type filter', f['totalPosts'] == type_counts[ctype])
    cat = posts[0]['category']
    st, f, _ = req('GET', f'/analytics?category={urllib.request.quote(cat)}', token=token)
    check('Category filter', f['totalPosts'] == cat_counts[cat])
    dates = sorted(p['date'][:10] for p in posts)
    lo, hi = dates[len(dates) // 4], dates[3 * len(dates) // 4]
    st, f, _ = req('GET', f'/analytics?startDate={lo}&endDate={hi}', token=token)
    check('Date range filter (inclusive)', f['totalPosts'] == sum(1 for d in dates if lo <= d <= hi), f'{lo}..{hi}')
    st, f, _ = req('GET', f'/analytics?platform={urllib.request.quote(platform)}&contentType={ctype}&startDate={lo}', token=token)
    check('Combined filters', f['totalPosts'] == sum(1 for p in posts if p['platform'] == platform and p['contentType'] == ctype and p['date'][:10] >= lo))
    st, f, _ = req('GET', '/analytics?category=NoSuchCategory', token=token)
    check('Filter with no results keeps dataset size', f['isEmpty'] and f['datasetPosts'] == len(posts))
    check('Invalid date filter -> 400', req('GET', '/analytics?startDate=2026-02-30', token=token)[0] == 400)
    check('Reversed date range -> 400', req('GET', f'/analytics?startDate={hi}&endDate={lo}', token=token)[0] in (400, 200 if lo == hi else 400))

    tok_empty, _, _ = register('EmptyAnalytics')
    st, e, _ = req('GET', '/analytics', token=tok_empty)
    check('Empty dataset analytics', st == 200 and e['isEmpty'] and e['datasetPosts'] == 0 and e['overviewKpiCards'] == [])


def test_insights(token, posts):
    section('INSIGHTS')
    st, r, _ = req('GET', '/analytics/insights', token=token)
    check('Normal dataset -> ok with insights', st == 200 and r['status'] == 'ok' and len(r['insights']) >= 5, f"{len(r.get('insights', []))} insights")
    check('Insights use the same dataset', r['totalPosts'] == len(posts))
    keys = {'id', 'title', 'description', 'category', 'metric', 'value', 'comparison', 'severity', 'sampleSize'}
    check('Every insight has the documented shape', all(set(i) == keys for i in r['insights']))
    check('Sample sizes respect the minimum group size', all(i['sampleSize'] >= 3 for i in r['insights']))
    corr = [i for i in r['insights'] if i['id'] == 'engagement-correlation']
    check('Correlation insight avoids causal claims',
          all('does not show that one causes the other' in i['description'] for i in corr), f'{len(corr)} correlation insight(s)')
    st, an, _ = req('GET', '/analytics', token=token)
    titles = {i['title'] for i in r['insights']}
    check('Dashboard quick insights come from the insights engine',
          all(q['text'].split(':')[0] in titles for q in an['quickInsights']))

    t_empty, _, _ = register('InsightsEmpty')
    check('Empty dataset -> status empty', req('GET', '/analytics/insights', token=t_empty)[1]['status'] == 'empty')
    t_small, _, _ = register('InsightsSmall')
    upload(t_small, (HEADER + csv_row('S1') + csv_row('S2') + csv_row('S3')).encode())
    st, r, _ = req('GET', '/analytics/insights', token=t_small)
    check('Small dataset -> insufficient', r['status'] == 'insufficient' and r['totalPosts'] == 3 and r['insights'] == [])

    t_tie, _, _ = register('InsightsTie')
    rows = ''.join(csv_row(f'R{i}', content_type='Reel', views='20000') for i in range(4))
    rows += ''.join(csv_row(f'V{i}', content_type='Video', views='20000') for i in range(4))
    upload(t_tie, (HEADER + rows).encode())
    st, r, _ = req('GET', '/analytics/insights', token=t_tie)
    tie = next((i for i in r['insights'] if i['id'] == 'content-views'), None)
    check('Tied values -> neutral "no clear leader"', tie and tie['severity'] == 'neutral' and tie['comparison'] == 'Tied')

    t_miss, _, _ = register('InsightsMissing')
    rows = ''.join(csv_row(f'M{i}', reach='0', content_type=('Reel', 'Video')[i % 2]) for i in range(8))
    upload(t_miss, (HEADER + rows).encode())
    st, r, _ = req('GET', '/analytics/insights', token=t_miss)
    check('Missing reach handled (no engagement-rate claims, no crash)',
          st == 200 and not any(i['metric'] == 'Avg Engagement Rate' and i['severity'] == 'positive' for i in r['insights']))


def test_prediction(token):
    section('PREDICTION')
    good = {'platform': 'Instagram', 'contentType': 'Reel', 'category': 'Travel', 'captionLength': 120,
            'hashtagsCount': 8, 'durationSeconds': 30, 'postingHour': 19, 'dayOfWeek': 'Saturday'}
    st, r, _ = req('POST', '/prediction', good, token)
    check('Valid prediction', st == 200 and r['prediction'] in ('Low', 'Medium', 'High') and 5 <= r['score'] <= 99, f"{r.get('prediction')} {r.get('score')}")
    check('Response shape', set(r) == {'prediction', 'score', 'model', 'message'})
    check('Deterministic', req('POST', '/prediction', good, token)[1] == r)
    cases = [
        ('missing fields', {'platform': 'Instagram'}, 'contentType'),
        ('invalid hour', {**good, 'postingHour': 24}, 'postingHour'),
        ('fractional hour', {**good, 'postingHour': 7.5}, 'postingHour'),
        ('invalid category', {**good, 'category': 'Gaming'}, 'category'),
        ('invalid platform', {**good, 'platform': 'TikTok'}, 'platform'),
        ('invalid content type', {**good, 'contentType': 'Story'}, 'contentType'),
        ('invalid day', {**good, 'dayOfWeek': 'Funday'}, 'dayOfWeek'),
        ('negative number', {**good, 'hashtagsCount': -1}, 'hashtagsCount'),
        ('numeric string', {**good, 'captionLength': '120'}, 'captionLength'),
        ('outcome variables', {**good, 'views': 1000, 'engagementRate': 5}, 'engagementRate'),
    ]
    for label, body, field in cases:
        st, r, _ = req('POST', '/prediction', body, token)
        fields = ' '.join(d.get('field') or '' for d in r.get('details', []))
        check(f'Rejects {label}', st == 400 and field in fields, fields)
    check('Malformed JSON to Node -> 400', req('POST', '/prediction', raw=b'{oops', token=token)[0] == 400)
    check('Flask malformed JSON -> 400', req('POST', '/predict', raw=b'{oops', base=ML)[0] == 400)
    check('Flask oversized body -> 413', req('POST', '/predict', raw=json.dumps({'x': 'a' * 50000}).encode(), base=ML)[0] == 413)
    check('Model loaded (health)', req('GET', '/health', base=ML)[1].get('modelLoaded') is True)


def test_compare(token, posts):
    section('COMPARE')
    st, r, _ = req('GET', '/analytics/compare?type=platform', token=token)
    opts = r['options']
    check('Options built from data', st == 200 and r['comparison'] is None and len(opts['platform']) >= 2)
    check('Month option counts sum to dataset', sum(o['posts'] for o in opts['date']) == len(posts))
    a, b = opts['platform'][0]['value'], opts['platform'][1]['value']
    st, r, _ = req('GET', f'/analytics/compare?type=platform&a={urllib.request.quote(a)}&b={urllib.request.quote(b)}', token=token)
    m = {x['key']: x for x in r['comparison']['metrics']}
    va = sum(p['views'] for p in posts if p['platform'] == a)
    vb = sum(p['views'] for p in posts if p['platform'] == b)
    check('Valid comparison values from the same dataset', m['total_views']['a'] == va and m['total_views']['b'] == vb)
    check('Difference = B - A', m['total_views']['difference'] == vb - va)
    check('% change = (B - A) / A × 100', close(m['total_views']['percentChange'], (vb - va) / va * 100, 0.01))
    check('10 metrics compared', len(m) == 10)
    st, r2, _ = req('GET', f'/analytics/compare?type=platform&a={urllib.request.quote(b)}&b={urllib.request.quote(a)}', token=token)
    m2 = {x['key']: x for x in r2['comparison']['metrics']}
    check('Swapping A/B flips the sign (negative differences)', m2['total_views']['difference'] == -m['total_views']['difference'])
    for mode in ('date', 'contentType', 'category'):
        o = req('GET', f'/analytics/compare?type={mode}', token=token)[1]['options'][mode]
        st, rr, _ = req('GET', f"/analytics/compare?type={mode}&a={urllib.request.quote(o[1]['value'])}&b={urllib.request.quote(o[0]['value'])}", token=token)
        check(f'{mode} comparison works', st == 200 and rr['comparison']['status'] == 'ok')

    st, r, _ = req('GET', '/analytics/compare?type=category&a=Travel&b=NoSuchCategory', token=token)
    check('Empty segment explained (status emptyB, no metrics)', r['comparison']['status'] == 'emptyB' and r['comparison']['metrics'] == [])
    st, r, _ = req('GET', '/analytics/compare?type=category&a=NoA&b=NoB', token=token)
    check('Both segments empty', r['comparison']['status'] == 'bothEmpty')
    check('Same segment twice -> 400', req('GET', '/analytics/compare?type=platform&a=Instagram&b=Instagram', token=token)[0] == 400)
    check('Invalid type -> 400', req('GET', '/analytics/compare?type=bogus', token=token)[0] == 400)
    check('Invalid month -> 400', req('GET', '/analytics/compare?type=date&a=Nov&b=2026-10', token=token)[0] == 400)

    t, _, _ = register('CompareEdge')
    rows = ''.join(csv_row(f'Z{i}', platform='Facebook', views='0', reach='0', likes='0') for i in range(3))
    rows += ''.join(csv_row(f'L{i}', platform='LinkedIn') for i in range(3))
    rows += ''.join(csv_row(f'Y{i}', platform='YouTube') for i in range(3))
    upload(t, (HEADER + rows).encode())
    st, r, _ = req('GET', '/analytics/compare?type=platform&a=Facebook&b=LinkedIn', token=t)
    zv = {x['key']: x for x in r['comparison']['metrics']}['total_views']
    check('Zero baseline -> no division, N/A note', zv['percentChange'] is None and zv['note'] == 'No baseline: A is 0')
    st, r, _ = req('GET', '/analytics/compare?type=platform&a=LinkedIn&b=YouTube', token=t)
    check('Equal segments -> 0 difference, 0%',
          all(x['difference'] == 0 and x['percentChange'] == 0.0 for x in r['comparison']['metrics']))
    st, r, _ = req('GET', '/analytics/compare?type=platform&a=LinkedIn&b=Facebook', token=t)
    lv = {x['key']: x for x in r['comparison']['metrics']}['total_views']
    check('Negative difference -> -100%', lv['difference'] < 0 and lv['percentChange'] == -100.0)
    t0, _, _ = register('CompareEmpty')
    st, r, _ = req('GET', '/analytics/compare', token=t0)
    check('Empty account -> empty options', all(v == [] for v in r['options'].values()))


def test_api_hardening(token):
    section('API HARDENING')
    st, r, _ = req('POST', '/posts', raw=b'{"bad', token=token)
    check('Malformed JSON -> 400 safe message', st == 400 and r == {'error': 'Request body must be valid JSON'})
    check('Oversized JSON -> 413', req('POST', '/posts', raw=json.dumps({'x': 'a' * 200000}).encode(), token=token)[0] == 413)
    st, r, h = req('GET', '/does-not-exist')
    check('Unknown route -> JSON 404', st == 404 and 'error' in r)
    check('No X-Powered-By header', 'X-Powered-By' not in h)
    h = req('GET', '/health', headers={'Origin': 'https://evil.example'})[2]
    check('CORS blocks unknown origins', 'Access-Control-Allow-Origin' not in h)
    h = req('GET', '/health', headers={'Origin': 'http://localhost:5173'})[2]
    check('CORS allows the app origin', h.get('Access-Control-Allow-Origin') == 'http://localhost:5173')
    bodies = [json.dumps(req(m, p, b, token)[1]) for m, p, b in
              [('POST', '/posts', {'platform': 1}), ('GET', '/analytics?startDate=x', None), ('PUT', '/posts/zzz', {'date': 'x'})]]
    check('Errors leak no stack traces or paths', not any('Traceback' in b or '/Users/' in b or '.js:' in b for b in bodies))
    if os.environ.get('SKIP_RATE_LIMIT') != '1':
        email = f'ratelimit-{RUN}@example.test'
        codes = [req('POST', '/auth/login', {'email': email, 'password': 'wrong-pass'})[0] for _ in range(12)]
        check('Repeated failed logins throttled (429 after 10)', codes[:10] == [401] * 10 and codes[10:] == [429, 429], str(codes))
        other = req('POST', '/auth/login', {'email': f'other-{RUN}@example.test', 'password': 'wrong-pass'})[0]
        check('Throttling is per account, other emails unaffected', other == 401)
    else:
        print('SKIP rate-limit check')


def main():
    try:
        test_health()
    except urllib.error.URLError as e:
        print(f'Cannot reach services: {e}. Start MongoDB, the Flask ML service and the Node API first.')
        sys.exit(2)
    test_auth()
    test_posts()
    test_csv()
    token, posts = load_dataset_user()
    test_analytics(token, posts)
    test_insights(token, posts)
    test_prediction(token)
    test_compare(token, posts)
    test_api_hardening(token)
    print(f'\n{passed}/{passed + len(failed)} checks passed')
    if failed:
        print('Failed:\n  - ' + '\n  - '.join(failed))
        sys.exit(1)


if __name__ == '__main__':
    main()
