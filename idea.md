
Domain : barberholic.gr
Black and White or Dark gray and White
Hero section stock barber pole or barber stuff in general
# Work hours
 Monday 10-6
 Tuesday - Firday 10-8
 Saturday 10-6
 Sunday Closed
 Time per haircut 40'
# Prices
 Prices section
 Man 10€
 Beard 5€
 Beard + haircut 12€
 Child 8€

 Contact : @barberholic2025 / 2312955747 / barberholic.2025@gmail.com
 Map in contact

 Reserve section
 Name
 Phone
 Time/Day
 Up to 2 weeks schedule
 Kind of haircut?


// SMTP config (Gmail)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'your.email@gmail.com',
    pass: 'your-app-password' // όχι τον κανονικό κωδικό, αλλά App Password
  }
});

// Συνάρτηση για αποστολή email
async function sendConfirmationEmail(toEmail, clientName, dateTime, serviceName) {
  const mailOptions = {
    from: '"Barber Shop" <your.email@gmail.com>',
    to: toEmail,
    subject: 'Επιβεβαίωση Ραντεβού',
    html: `
      <h2>Γεια σου ${clientName}!</h2>
      <p>Το ραντεβού σου για <b>${serviceName}</b> στις <b>${dateTime}</b> κλείστηκε με επιτυχία.</p>
      <p>Σε περιμένουμε στο Barber Shop μας!</p>
    `
  };

  await transporter.sendMail(mailOptions);
}

    na megalwsw thn apostash apo dropdown oras me footer OK push to git and netlify
    change time between reserves 45 mins -> 30 mins OK push to git and netlify
    
