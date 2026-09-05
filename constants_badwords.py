# Daftar Kata Terlarang (Profanity, Rasisme, SARA, Kasar, Judol, Konten Dewasa Ekstrem)
FORBIDDEN_WORDS = [
    # Rasisme & SARA
    'anjing', 'babi', 'monyet', 'bajingan', 'bangsat', 'brengsek', 'kampret',
    'kontol', 'memek', 'jembut', 'itil', 'ngentot', 'ngentod', 'titit', 'pepek',
    'perek', 'lonte', 'pelacur', 'bencong', 'banci', 'homo', 'lesbi', 'kafir',
    'pribumi', 'cina', 'chindo', 'papua', 'negro', 'nigger', 'nigga',
    # Pornografi & Dewasa Ekstrem
    'bokep', 'porn', 'porno', 'sex', 'seks', 'masturbasi', 'onani', 'coli',
    'bugil', 'telanjang', 'openbo', 'vcs', 'bo_online',
    # Judi Online & Promosi Terlarang
    'slot', 'judol', 'gacor', 'zeus', 'pragmatic', 'maxwin', 'togel', 'sbobet',
    'depo', 'wd_cepat', 'jackpot88', 'hoki88', 'slot88', 'casino', 'roulette',
    # Narkotika Promosi (Jual Beli)
    'jual_sabu', 'beli_sabu', 'ganja_murah', 'sinte_ready', 'tembakau_gorila',
    # English Profanity
    'fuck', 'shit', 'bitch', 'asshole', 'cunt', 'dick', 'pussy', 'whore', 'bastard'
]

def contains_forbidden_words(text: str) -> tuple[bool, str]:
    if not text:
        return False, ""
    cleaned = text.lower()
    # Hapus karakter pemisah seperti titik, spasi berlebih, underscore untuk deteksi
    normalized = ''.join(c if c.isalnum() else ' ' for c in cleaned)
    words = normalized.split()
    
    for word in words:
        if word in FORBIDDEN_WORDS:
            return True, word
            
    # Cek substring untuk kata kunci tertentu yang sering disambung
    dangerous_substrings = ['judislot', 'slotgacor', 'ngentot', 'kontol', 'memek', 'bokep']
    for sub in dangerous_substrings:
        if sub in cleaned:
            return True, sub
            
    return False, ""
