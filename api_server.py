import http.server
import socketserver
import json
import sqlite3
import os
import sys
import urllib.request
import urllib.error
from constants_badwords import contains_forbidden_words, censor_ethnic_words, is_reserved_username

PORT = 8090
DB_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'againstme.db')
# Baca API key 9Router dari .env jika ada
env_file = os.path.expanduser('~/.hermes/.env')
loaded_key = None
if os.path.exists(env_file):
    with open(env_file, 'r') as ef:
        for line in ef:
            line = line.strip()
            if line.startswith('HERMES_CUSTOM_192_168_1_9_20128_API_KEY='):
                loaded_key = line.split('=', 1)[1].strip().strip('"').strip("'")
                break
            elif line.startswith('OPENAI_API_KEY=') and not loaded_key:
                loaded_key = line.split('=', 1)[1].strip().strip('"').strip("'")

ROUTER_URL = "http://127.0.0.1:20128/v1/chat/completions"
ROUTER_API_KEY = os.environ.get("HERMES_CUSTOM_192_168_1_9_20128_API_KEY", loaded_key or "sk-antigravity")

def init_db():
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute('PRAGMA journal_mode=WAL;')
    c.execute('''
        CREATE TABLE IF NOT EXISTS users (
            username TEXT PRIMARY KEY,
            name TEXT,
            email TEXT UNIQUE,
            password TEXT,
            bio TEXT,
            photo_url TEXT,
            state_json TEXT,
            is_banned INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    # Migration: pastikan kolom is_banned ada
    try:
        c.execute('ALTER TABLE users ADD COLUMN is_banned INTEGER DEFAULT 0')
    except Exception:
        pass

    # Buat tabel postingan komunitas yang tersinkronisasi global
    c.execute('''
        CREATE TABLE IF NOT EXISTS community_posts (
            id TEXT PRIMARY KEY,
            author TEXT,
            username TEXT,
            photo_url TEXT,
            habit TEXT,
            streak_days INTEGER,
            time_str TEXT,
            content TEXT,
            likes INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    conn.commit()
    conn.close()

init_db()

SYSTEM_PROMPT_TEMPLATE = """Kamu adalah 'Teman Berhenti' resmi di aplikasi AgainstMe.
Nama panggilanmu: Maya.

PERSONA & GAYA BICARA:
1. PANGGILAN KEPADA USER: Panggil user HANYA dengan nama atau username mereka (contoh: "Hai Jon", "Jon, kamu..."). DILARANG KERAS memanggil user dengan sebutan "babe", "bestie", "kak", "bro", atau "sis".
2. KALIMAT PEMBUKA STANDAR: "Hai {name}, aku Maya, kalau butuh temen ngobrol, cerita ke aku yaa.."
3. SIKAP & TONE:
   - Ramah, hangat, santai, dan mengalir natural layaknya teman dekat.
   - JANGAN PERNAH mendeklarasikan atau memvalidasi diri sendiri seperti "aku ramah kok", "aku chill tanpa nge-judge ya", "aku tidak akan menghakimi", atau semacamnya! Biarkan keramahan dan sifat suportifmu terasa secara alami dari caramu merespons, tanpa perlu diucapkan secara eksplisit.
   - Dengarkan dengan tulus, empatik, jangan menggurui atau sok menasehati panjang lebar.
4. ATURAN TEKS KETAT:
   - JANGAN gunakan simbol markdown formatting seperti tanda bintang asterisk (*), garis strip bullet (-), atau tanda kurung berlebihan.
   - Tulis layaknya pesan chat WhatsApp biasa yang bersih, ringkas, dan mengalir santai.
5. SAAT USER MERASA BERAT / SAKAU / RELAPSE:
   - Berikan respon yang tenang, ringkas (2-4 kalimat), dan actionable.
   - Langsung ajak tindakan fisik pereda dorongan: tarik napas pelan, minum segelas air dingin, atau basuh muka air es.
   - Tetap ingatkan bahwa rasa gelisah dan godaan ini hanya gelombang dopamin sesaat yang akan segera mereda."""

class ApiHandler(http.server.BaseHTTPRequestHandler):
    def _send_cors(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')

    def do_OPTIONS(self):
        self.send_response(200)
        self._send_cors()
        self.end_headers()

    def do_GET(self):
        if self.path == '/api/health':
            self.send_response(200)
            self._send_cors()
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({'status': 'ok', 'service': 'AgainstMe API Backend'}).encode('utf-8'))
        else:
            self.send_response(404)
            self._send_cors()
            self.end_headers()

    def do_POST(self):
        content_length = int(self.headers.get('Content-Length', 0))
        post_data = self.rfile.read(content_length)
        
        try:
            body = json.loads(post_data.decode('utf-8')) if post_data else {}
        except Exception:
            self.send_response(400)
            self._send_cors()
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({'error': 'Invalid JSON'}).encode('utf-8'))
            return

        # 1. REGISTER
        if self.path == '/api/register':
            username = body.get('username', '').strip().lower()
            name = body.get('name', '').strip()
            email = body.get('email', '').strip().lower()
            password = body.get('password', '')
            state_json = json.dumps(body.get('state', {}))

            if not username or not email:
                self.send_response(400)
                self._send_cors()
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'error': 'Username dan Email wajib diisi'}).encode('utf-8'))
                return

            # Cek Username Reserved (Presiden, Suku, Pulau, Agama, Tuhan)
            if is_reserved_username(username):
                self.send_response(400)
                self._send_cors()
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'error': f'Username "{username}" tidak dapat digunakan (nama reserved).'}).encode('utf-8'))
                return

            # Filter Kata Terlarang pada Username dan Nama
            is_bad_u, bad_word_u = contains_forbidden_words(username)
            if is_bad_u:
                self.send_response(400)
                self._send_cors()
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'error': f'Username mengandung kata terlarang ("{bad_word_u}"). Gunakan username yang sopan.'}).encode('utf-8'))
                return

            is_bad_n, bad_word_n = contains_forbidden_words(name)
            if is_bad_n:
                self.send_response(400)
                self._send_cors()
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'error': f'Nama mengandung kata terlarang ("{bad_word_n}").'}).encode('utf-8'))
                return

            try:
                conn = sqlite3.connect(DB_FILE)
                c = conn.cursor()
                c.execute('''
                    INSERT INTO users (username, name, email, password, bio, photo_url, state_json)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                ''', (username, name, email, password, body.get('bio', ''), body.get('photoUrl', None), state_json))
                conn.commit()
                conn.close()

                self.send_response(200)
                self._send_cors()
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'success': True, 'username': username, 'name': name}).encode('utf-8'))
            except sqlite3.IntegrityError:
                self.send_response(409)
                self._send_cors()
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'error': 'Username or email already exists'}).encode('utf-8'))

        # 2. LOGIN
        elif self.path == '/api/login':
            identifier = body.get('email', '').strip().lower()
            password = body.get('password', '')

            conn = sqlite3.connect(DB_FILE)
            c = conn.cursor()
            c.execute('''
                SELECT username, name, email, bio, photo_url, state_json, password, is_banned 
                FROM users WHERE email = ? OR username = ?
            ''', (identifier, identifier))
            row = c.fetchone()
            conn.close()

            if not row or (row[6] and row[6] != password):
                self.send_response(401)
                self._send_cors()
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'error': 'Kredensial tidak valid'}).encode('utf-8'))
                return

            if len(row) > 7 and row[7] == 1:
                self.send_response(403)
                self._send_cors()
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'error': 'Akun Anda telah dinonaktifkan oleh administrator karena melanggar aturan komunitas.'}).encode('utf-8'))
                return

            state_data = json.loads(row[5]) if row[5] else {}
            user_data = {
                'username': row[0],
                'name': row[1],
                'email': row[2],
                'bio': row[3],
                'photoUrl': row[4],
                'avatar': (row[1] or 'R').strip()[0].upper()
            }

            self.send_response(200)
            self._send_cors()
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({
                'success': True,
                'user': user_data,
                'state': state_data
            }).encode('utf-8'))

        # 2b. RESET PASSWORD
        elif self.path == '/api/reset-password':
            identifier = body.get('identifier', '').strip().lower()
            email = body.get('email', '').strip().lower()
            new_password = body.get('newPassword', '')

            if not identifier or not email or not new_password:
                self.send_response(400)
                self._send_cors()
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'error': 'Semua kolom wajib diisi'}).encode('utf-8'))
                return

            conn = sqlite3.connect(DB_FILE)
            c = conn.cursor()
            # Cek kecocokan kombinasi username dan email
            c.execute('''
                SELECT username, name, email, bio, photo_url, state_json
                FROM users 
                WHERE (username = ? OR email = ?) AND email = ?
            ''', (identifier, identifier, email))
            row = c.fetchone()

            if not row:
                conn.close()
                self.send_response(404)
                self._send_cors()
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'error': 'Kombinasi username dan email tidak cocok'}).encode('utf-8'))
                return

            username = row[0]
            c.execute('UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE username = ?', (new_password, username))
            conn.commit()
            conn.close()

            state_data = json.loads(row[5]) if row[5] else {}
            user_data = {
                'username': row[0],
                'name': row[1],
                'email': row[2],
                'bio': row[3],
                'photoUrl': row[4],
                'avatar': (row[1] or 'R').strip()[0].upper()
            }

            self.send_response(200)
            self._send_cors()
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({
                'success': True,
                'message': 'Password berhasil direset',
                'user': user_data,
                'state': state_data
            }).encode('utf-8'))

        # 2c. DELETE ACCOUNT & ALL DATA PERMANENTLY (Google Play Requirement)
        elif self.path == '/api/delete-account':
            username = body.get('username', '').strip().lower()
            password = body.get('password', '')

            if not username:
                self.send_response(400)
                self._send_cors()
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'error': 'Username is required'}).encode('utf-8'))
                return

            conn = sqlite3.connect(DB_FILE)
            c = conn.cursor()
            c.execute('SELECT password FROM users WHERE username = ?', (username,))
            row = c.fetchone()

            if not row:
                conn.close()
                self.send_response(404)
                self._send_cors()
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'error': 'Akun tidak ditemukan'}).encode('utf-8'))
                return

            # Jika password diberikan, verifikasi password
            if row[0] and password and row[0] != password:
                conn.close()
                self.send_response(401)
                self._send_cors()
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'error': 'Kata sandi tidak sesuai'}).encode('utf-8'))
                return

            # Hapus data user dan seluruh jejak sinkronisasinya
            c.execute('DELETE FROM users WHERE username = ?', (username,))
            conn.commit()
            conn.close()

            self.send_response(200)
            self._send_cors()
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({
                'success': True,
                'message': 'Akun dan seluruh data Anda telah dihapus permanen.'
            }).encode('utf-8'))

        # 3. SYNC STATE TO SERVER
        elif self.path == '/api/sync':
            username = body.get('username', '').strip().lower()
            state = body.get('state', {})
            user_obj = body.get('user', {})

            if not username:
                self.send_response(400)
                self._send_cors()
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'error': 'Username required'}).encode('utf-8'))
                return

            conn = sqlite3.connect(DB_FILE)
            c = conn.cursor()
            c.execute('''
                UPDATE users 
                SET state_json = ?, name = COALESCE(?, name), bio = COALESCE(?, bio), 
                    photo_url = COALESCE(?, photo_url), updated_at = CURRENT_TIMESTAMP
                WHERE username = ?
            ''', (json.dumps(state), user_obj.get('name'), user_obj.get('bio'), user_obj.get('photoUrl'), username))
            conn.commit()
            conn.close()

            self.send_response(200)
            self._send_cors()
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({'success': True, 'synced': True}).encode('utf-8'))

        # 5. ADMIN ENDPOINTS (KHUSUS AKUN @admin)
        elif self.path == '/api/admin/users':
            admin_user = body.get('adminUser', '').strip().lower()
            if admin_user != 'admin':
                self.send_response(403)
                self._send_cors()
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'error': 'Akses ditolak. Khusus Administrator.'}).encode('utf-8'))
                return

            conn = sqlite3.connect(DB_FILE)
            c = conn.cursor()
            c.execute('SELECT username, name, email, bio, is_banned, created_at FROM users ORDER BY created_at DESC')
            users = []
            for r in c.fetchall():
                users.append({
                    'username': r[0],
                    'name': r[1],
                    'email': r[2],
                    'bio': r[3],
                    'isBanned': bool(r[4]),
                    'createdAt': r[5]
                })
            conn.close()

            self.send_response(200)
            self._send_cors()
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({'success': True, 'users': users}).encode('utf-8'))

        elif self.path == '/api/admin/ban-user':
            admin_user = body.get('adminUser', '').strip().lower()
            target_user = body.get('targetUser', '').strip().lower()
            ban_status = body.get('ban', True)

            if admin_user != 'admin':
                self.send_response(403)
                self._send_cors()
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'error': 'Akses ditolak'}).encode('utf-8'))
                return

            if target_user == 'admin':
                self.send_response(400)
                self._send_cors()
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'error': 'Tidak dapat menonaktifkan akun admin utama'}).encode('utf-8'))
                return

            conn = sqlite3.connect(DB_FILE)
            c = conn.cursor()
            c.execute('UPDATE users SET is_banned = ? WHERE username = ?', (1 if ban_status else 0, target_user))
            conn.commit()
            conn.close()

            self.send_response(200)
            self._send_cors()
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({'success': True, 'message': f'User @{target_user} status updated'}).encode('utf-8'))

        # 6. POSTING KOMUNITAS (DENGAN FILTER KATA TERLARANG + SENSOR NAMA SUKU)
        elif self.path == '/api/community/check-post':
            content = body.get('content', '')
            
            # Cek kata terlarang ekstrem (ditolak total)
            is_bad, bad_word = contains_forbidden_words(content)
            if is_bad:
                self.send_response(400)
                self._send_cors()
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'error': f'Postingan mengandung kata yang dilarang ("{bad_word}"). Mari jaga ruang ini tetap aman dan positif!'}).encode('utf-8'))
                return

            # Sensor nama suku/etnis (diizinkan tapi disensor jadi ****)
            censored_content = censor_ethnic_words(content)
            
            self.send_response(200)
            self._send_cors()
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({
                'success': True,
                'censored_content': censored_content
            }).encode('utf-8'))
            return

        # 4. CHAT AI VIA 9ROUTER COMBO (ISOLASI JALUR & KONTEKS KHUSUS PER USER)
        elif self.path == '/api/chat':
            messages = body.get('messages', [])
            user_context = body.get('userContext', {})
            session_user_id = body.get('userId') or user_context.get('username') or 'guest_anonymous'

            # Siapkan percakapan dengan system prompt yang dipersonalisasi
            context_snippet = f"\n\nKONTEKS USER AKTIF:\n- User ID / Username: @{session_user_id}\n- Nama Panggilan: {user_context.get('name', 'Bestie')}\n- Habit/Program yang sedang dijalani: {', '.join(user_context.get('habits', ['Pemulihan Diri']))}\n- Streak Saat Ini: {user_context.get('days', 0)} hari bebas"

            full_messages = [
                {"role": "system", "content": SYSTEM_PROMPT_TEMPLATE + context_snippet}
            ]
            
            # Ambil maksimal 8 pesan terakhir agar isolasi konteks tetap terjaga per sesi obrolan
            for msg in messages[-8:]:
                content = msg.get('text') or msg.get('content', '')
                if content and content.strip():
                    full_messages.append({
                        "role": "user" if msg.get('sender') == 'user' else "assistant",
                        "content": content.strip()
                    })

            req_payload = {
                "model": "combo-fast",
                "messages": full_messages,
                "temperature": 0.8,
                "max_tokens": 500,
                "user": f"againstme_user_{session_user_id}", # Isolasi ID unik ke gateway/LLM agar tidak tercampur
                "stream": False
            }

            try:
                headers = {
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {ROUTER_API_KEY}"
                }
                req = urllib.request.Request(
                    ROUTER_URL,
                    data=json.dumps(req_payload).encode('utf-8'),
                    headers=headers
                )
                with urllib.request.urlopen(req, timeout=30) as response:
                    raw_text = response.read().decode('utf-8')
                    reply = ""
                    # Handle both JSON and SSE stream chunks
                    if raw_text.startswith('data:'):
                        for line in raw_text.splitlines():
                            line = line.strip()
                            if line.startswith('data:') and not line.endswith('[DONE]'):
                                try:
                                    chunk = json.loads(line[5:].strip())
                                    delta = chunk.get('choices', [{}])[0].get('delta', {})
                                    reply += delta.get('content', '')
                                except Exception:
                                    pass
                    else:
                        res_body = json.loads(raw_text)
                        reply = res_body.get('choices', [{}])[0].get('message', {}).get('content', '')
                        if reply:
                            reply = reply.strip()

                    # Pembersihan otomatis: buang markdown asterisks (*), bullets (-), dan tanda kurung yang mengganggu
                    clean_reply = reply.replace('**', '').replace('*', '').replace('`', '')
                    # Rapikan bullet points jika ada
                    lines = [l.lstrip('-• ').strip() for l in clean_reply.splitlines() if l.strip()]
                    clean_reply = '\n'.join(lines)

                    self.send_response(200)
                    self._send_cors()
                    self.send_header('Content-Type', 'application/json')
                    self.end_headers()
                    self.wfile.write(json.dumps({'reply': clean_reply.strip()}).encode('utf-8'))
            except Exception as e:
                # Fallback jika 9Router sedang busy atau error koneksi
                fallback_reply = "Napas dulu dalam-dalam (tarik 4 detik, tahan 7 detik, hembuskan perlahan 8 detik). Aku di sini nemenin kamu. Pikiran impulsif ini cuma gelombang sementara, jangan dituruti. Coba minum air dingin sekarang dan basuh mukamu, kamu pasti bisa lewati ini!"
                self.send_response(200)
                self._send_cors()
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'reply': fallback_reply, 'fallback': True, 'error': str(e)}).encode('utf-8'))

        else:
            self.send_response(404)
            self._send_cors()
            self.end_headers()

class ReusableTCPServer(socketserver.TCPServer):
    allow_reuse_address = True

if __name__ == '__main__':
    with ReusableTCPServer(('0.0.0.0', PORT), ApiHandler) as httpd:
        print(f"AgainstMe Backend API running on port {PORT}")
        httpd.serve_forever()
