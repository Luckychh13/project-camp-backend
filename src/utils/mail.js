import Mailgen from "mailgen";
import nodemailer from "nodemailer"


const sendEmail=async(options)=>{
    const mailGenerator=new Mailgen({
        theme:"default",
        product:{
            name:"Task Manager",
            link:"http://taskmanagerlink.com"
        }
    })

    const emailTextual=mailGenerator.generatePlaintext(options.mailgenContent)
    const emailHtml=mailGenerator.generate(options.mailgenContent)

    const transporter=nodemailer.createTransport({
        host:process.env.MAIL_TRAP_SMTP_HOST,
        port:process.env.MAIL_TRAP_SMTP_PORT,
        auth:{
            user:process.env.MAIL_TRAP_SMTP_USER,
            pass:process.env.MAIL_TRAP_SMTP_PASS
        }
    })

    const mail={
        from:"mail.taskmanager@example.com",
        to:options.email,
        subject:options.subject,
        text:emailTextual,
        html:emailHtml
    }


    try {
        await transporter.sendMail(mail);
    } catch (error) {
        console.error("Email service fail siliently.Make sure that u have provided your MAILTRAP credentials in the .env file");
        console.error("Error:",error);
    }
} 

const emailVerificationMailgenContent=(username,verificationUrl)=>{
    return{
        body:{
            name:username,
            intro:"Welcome to our app! we are excited to have you on our board",
            action:{
                instruction:"To verify ur email please click on the follwoing button",
                button:{
                    color:"#22BC66",
                    text:"Verify your email",
                    link:verificationUrl,
                },
            },
            outro:"Need help, or have question? Just reply to this email,we would love to help",
        },
    }
}


const forgotPasswordMailgenContent=(username,passwordResetUrl)=>{
    return{
        body:{
            name:username,
            intro:"We got the request to rest the password of your account",
            action:{
                instruction:"To verify ur password please click on the follwoing button",
                button:{
                    color:"#22BC66",
                    text:"Reset Password",
                    link:passwordResetUrl,
                },
            },
            outro:"Need help, or have question? Just reply to this email,we would love to help",
        },
    }
}

export{emailVerificationMailgenContent,forgotPasswordMailgenContent,sendEmail}