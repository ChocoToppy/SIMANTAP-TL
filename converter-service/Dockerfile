FROM node:20-slim

# libreoffice-writer saja (bukan paket libreoffice penuh) cukup untuk
# konversi .docx -> pdf dan jauh lebih kecil untuk di-build & di-cold-start.
#
# Font pengganti WAJIB ada, kalau tidak LibreOffice mengganti Arial/Times New
# Roman/Calibri/Cambria di template surat dengan font lain yang metrik
# (lebar/tinggi huruf)-nya beda -> tabel kop surat & layout jadi berantakan.
# fonts-liberation  : Liberation Sans/Serif/Mono, pengganti metrik-identik utk Arial/Times New Roman/Courier New
# fonts-crosextra-* : Carlito/Caladea, pengganti metrik-identik utk Calibri/Cambria
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
      libreoffice-writer \
      fonts-liberation \
      fonts-crosextra-carlito \
      fonts-crosextra-caladea \
      fontconfig && \
    fc-cache -f && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev
COPY server.js ./

ENV NODE_ENV=production
EXPOSE 8080
CMD ["node", "server.js"]
