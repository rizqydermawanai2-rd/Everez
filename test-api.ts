import fetch from 'node-fetch';

const apiKey = '359d2ddcebmsh3d0b2d7a37a9fb0p1ab0e2jsn1429e29cc086';
const apiHost = 'cek-resi-cek-ongkir.p.rapidapi.com';

async function test() {
  const res = await fetch(`https://${apiHost}/city?search=Bandung`, {
    headers: {
      'x-rapidapi-key': apiKey,
      'x-rapidapi-host': apiHost
    }
  });
  console.log(res.status, res.statusText);
  const text = await res.text();
  console.log(text);
}
test();
