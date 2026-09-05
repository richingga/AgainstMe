# Daftar Kata Terlarang - DITOLAK TOTAL (Profanity, SARA Ekstrem, Judi, Pornografi)
FORBIDDEN_WORDS = [
    # Kata Kasar & Vulgar Ekstrem
    'anjing', 'babi', 'monyet', 'bajingan', 'bangsat', 'brengsek', 'kampret',
    'kontol', 'memek', 'jembut', 'itil', 'ngentot', 'ngentod', 'titit', 'pepek',
    'perek', 'lonte', 'pelacur', 'bencong', 'banci', 'homo', 'lesbi', 'kafir',
    'negro', 'nigger', 'nigga',
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

# Daftar Nama Suku di Indonesia - DISENSOR JADI **** (Anti Diskriminasi Etnis)
ETHNIC_WORDS = [
    # Suku-suku Besar di Indonesia
    'jawa', 'sunda', 'batak', 'minang', 'minangkabau', 'padang', 'betawi', 
    'madura', 'bali', 'bugis', 'makassar', 'dayak', 'papua', 'ambon', 'maluku',
    'aceh', 'melayu', 'toraja', 'sasak', 'lombok', 'nias', 'mentawai',
    'manado', 'minahasa', 'gorontalo', 'ternate', 'tidore', 'flores', 'timor',
    'sumba', 'alor', 'rote', 'sabu', 'komodo', 'bajau', 'banjar', 'palembang',
    'lampung', 'jambi', 'riau', 'bengkulu', 'musi', 'ogan', 'komering',
    # Suku Papua & Maluku
    'asmat', 'dani', 'yali', 'lani', 'mee', 'ekari', 'amungme', 'korowai',
    'kombai', 'sentani', 'biak', 'waropen', 'wandamen', 'serui', 'numfor',
    'halmahera', 'kao', 'tobelo', 'galela', 'loloda', 'sahu',
    # Suku Kalimantan
    'ngaju', 'iban', 'kenyah', 'kayan', 'punan', 'benuaq', 'tunjung', 'kutai',
    'banjar', 'bakumpai', 'maanyan', 'lawangan', 'dusun', 'murut', 'tidung',
    # Suku Sulawesi
    'toraja', 'tolaki', 'muna', 'buton', 'kaili', 'pamona', 'kulawi', 'lore',
    'gorontalo', 'mongondow', 'bolaang', 'sangihe', 'talaud', 'minahasa',
    # Suku Sumatera
    'gayo', 'alas', 'karo', 'pakpak', 'simalungun', 'toba', 'mandailing',
    'angkola', 'nias', 'mentawai', 'enggano', 'rejang', 'kerinci', 'kubu',
    'lembak', 'pasemah', 'komering', 'ogan', 'semendo', 'besemah',
    # Suku Nusa Tenggara
    'sasak', 'sumbawa', 'bima', 'manggarai', 'ngada', 'ende', 'lio', 'sikka',
    'lamaholot', 'kedang', 'solor', 'adonara', 'lembata', 'atoni', 'tetun',
    'helong', 'rote', 'sabu', 'sumba', 'kodi', 'wanukaka', 'lamboya',
    # Tambahan Etnis
    'tionghoa', 'cina', 'chindo', 'arab', 'india', 'tamil', 'pribumi'
]

def contains_forbidden_words(text: str) -> tuple[bool, str]:
    """Cek kata terlarang - DITOLAK TOTAL"""
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

def censor_ethnic_words(text: str) -> str:
    """Sensor nama suku/etnis jadi **** (tidak ditolak, hanya disensor)"""
    if not text:
        return text
    
    result = text
    cleaned = text.lower()
    
    # Cari dan sensor setiap kata suku yang muncul (case-insensitive)
    for ethnic in ETHNIC_WORDS:
        # Gunakan regex word boundary untuk match kata utuh
        import re
        pattern = r'\b' + re.escape(ethnic) + r'\b'
        # Ganti dengan bintang sejumlah huruf kata asli
        replacement = '*' * len(ethnic)
        result = re.sub(pattern, replacement, result, flags=re.IGNORECASE)
    
    return result
