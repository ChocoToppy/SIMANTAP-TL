// Wilayah Cloud Functions yang dipanggil pengguna: sama dengan Firestore (asia-southeast2).
// Trigger latar belakang (onUserCreate, jagaIndeksArsip, catatPerubahanDataSurat) tetap di
// us-central1; memindahkannya berarti dua trigger menyala bersamaan selama peralihan dan
// angka statistik/lulus (FieldValue.increment) terhitung dobel.
module.exports = 'asia-southeast2';
