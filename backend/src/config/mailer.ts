import nodemailer from 'nodemailer'

const mailer = nodemailer.createTransport({

  service:'Hotmail',
  auth: {
    user: 'lsn_cearamor@hotmail.com',
    pass: 'Cearamor1@'
  },
  });

export default mailer
