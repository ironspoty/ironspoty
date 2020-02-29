axios.get('/userData').then(values => {

  // arrayTracks.forEach((e) => console.log("This is the id of song", e.track.id))


  console.log("Array de 3 dimensiones con danceability, energy y tempo ", values.data.data)
  let data = values.data.data;
  let dataDance = values.data.data[0].reverse();
  let dataEnergy = values.data.data[1].reverse();
  let dataTempo = values.data.data[2].reverse();
  let long = data[0].length; //Cogemos la longitud del primer elemento del array




  console.log("Esta es la longitud", long)

  let arr = [],
    x = long;

  for (let i = 0; i < x; i++) {
    arr.push("*");
  }



  console.log("Array con eje x", arr)

  const ctx = document.getElementById('myChart').getContext('2d');
  const myChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: arr,
      datasets: [{
        label: 'Danceability 🕺🏿',
        data: dataDance,
        backgroundColor: [
          'rgba(255, 159, 64, 0.8)'
        ],

        borderWidth: 1
      }]
    },
    options: {
      scales: {
        yAxes: [{
          ticks: {
            beginAtZero: true
          }
        }]
      }
    }
  });


  const ctx2 = document.getElementById('myChart2').getContext('2d');
  const myChart2 = new Chart(ctx2, {
    type: 'line',
    data: {
      labels: arr,
      datasets: [{
        label: 'Energy ⚡️',
        data: dataEnergy,
        backgroundColor: [
          'rgba(255, 99, 132, 0.8)'
        ],

        borderWidth: 1
      }]
    },
    options: {
      scales: {
        yAxes: [{
          ticks: {
            beginAtZero: true
          }
        }]
      }
    }
  });


  const ctx3 = document.getElementById('myChart3').getContext('2d');
  const myChart3 = new Chart(ctx3, {
    type: 'line',
    data: {
      labels: arr,
      datasets: [{
        label: 'Tempo 🥁',
        fontColor: 'rgba(54, 162, 235)',
        data: dataTempo,
        backgroundColor: [
          'rgba(54, 162, 235, 0.8)'
        ],

        borderWidth: 1
      }]
    },
    options: {
      scales: {
        yAxes: [{
          ticks: {
            beginAtZero: true
          }
        }]
      }
    }
  });
})