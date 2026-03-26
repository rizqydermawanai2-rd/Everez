import https from 'https';

https.get('https://rapidapi.com/vidlab/api/cek-resi-cek-ongkir', (res) => {
  let data = '';
  res.on('data', (d) => { data += d; });
  res.on('end', () => {
    console.log(data.substring(0, 5000));
  });
});



