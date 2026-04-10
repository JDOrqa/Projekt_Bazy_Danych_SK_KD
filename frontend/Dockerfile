FROM node:20-alpine

WORKDIR /app

# Kopiujemy tylko package.json (brak lockfile)
COPY package.json ./

RUN npm install

# Kopiujemy resztę kodu źródłowego
COPY . .

EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]