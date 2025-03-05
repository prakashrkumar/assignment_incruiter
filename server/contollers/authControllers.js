
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import userModel from "../models/userModels.js";
import transporter from "../config/nodemailer.js";
import { EMAIL_VERIFY_TEMPLATE,PASSWORD_RESET_TEMPLATE } from "../config/emailTemplate.js";



export const register=async(req,res)=>{
    const{name,email,password}=req.body;
    if(!name || !email || !password){
        return res.json({success:false, message:"Missing the Deatils"});
    }
    try{
        const existingUser=await userModel.findOne({email})
        if(existingUser){
            return res.json({success:false,message:"user allready exisiting"})
        }
        const hashedPassword=await bcrypt.hash(password,10);
        const user= new userModel({name,email,password:hashedPassword})
        await user.save()


        const token=jwt.sign({id:user._id},process.env.JWT_SECRET, {expiresIn:"7d" })
        res.cookie('token',token, {
            httpOnly:true,
            secure:process.env.NODE_ENV=== 'production',
            sameSite:process.env.NODE_ENV==='production' ? 'none' :'strict',
            maxAge:7*24*60*60*1000


        })
        // sending wellcom mail
        const mailOptions = {
            from :process.env.SENDER_EMAIL,
            to:email,
            subject:'Wellcom to prakash',
            text:`wellcom to this process : your account is createrd with email id: ${email}`

        }
       // console.log("mailOptions",mailOptions)
        await transporter.sendMail(mailOptions);



       return  res.json({success:true})

    }
    catch(error){
      return   res.json({success:false,message:error.message})
    }
}


export const login=async(req,res)=>{
    const{email,password}=req.body;
    if(!email || !password){
        return res.json({success:false,message:"Email and Password both are required"})
    }
    try{
        const user =await userModel.findOne({email})
        if(!user){
            return res.json({success:false,message:"INvalied email"})
        }
        const isMatch=await bcrypt.compare(password,user.password);
        if(!isMatch){
            return res.json({success:false,message:"Invalied password"}) 
        }
        const token=jwt.sign({id:user._id},process.env.JWT_SECRET, {expiresIn:"7d" })
        res.cookie('token',token, {
            httpOnly:true,
            secure:process.env.NODE_ENV=== 'production',
            sameSite:process.env.NODE_ENV==='production' ? 'none' :'strict',
            maxAge:7*24*60*60*1000


        })
      return   res.json({success:true})

    }
   catch(error){
   return  res.json({success:false,message:error.message})

   }

}



export const logout=async(req,res)=>{
    try{
        res.clearCookie('token',{
            httpOnly:true,
            secure:process.env.NODE_ENV=== 'production',
            sameSite:process.env.NODE_ENV==='production' ? 'none' :'strict',
            

        })
        return res.json({success:true,message:"Logged Out"})

    }
    catch(error){
        return  res.json({success:false,message:error.message})

    }
}


export const sendVerifyOtp=async(req,res)=>{

   try{
    const {userId}=req.body;
    const user=await userModel.findById(userId);
    if(user.isAccountVerified){
        return res.json({success:false,message:"Account Allready verified"})
    }
 const otp=  String( Math.floor(100000  +Math.random() * 900000))

 user.verifyOtp=otp;
 user.verifyOtpExpireAt=Date.now()+24 *60*60*1000
 await user.save()
 const mailOption={
    from :process.env.SENDER_EMAIL,
            to:user.email,
            subject:'Account verification Otp',
            //text:`your otp is ${opt}.verify your account using this otp`,
            html:EMAIL_VERIFY_TEMPLATE.replace("{{otp}}",otp).replace("{{email}}",user.email)

 }
 await transporter.sendMail(mailOption)
 res.json({success:true,message:"verification otp send on your Email"})

   }
   catch(error){
    res.json({success:false,message:error.message})
   }
}


//verify the email using otp
export const verifyEmail=async(req,res)=>{
    const {userId,otp}=req.body;
if(!user || !otp){
    return res.json({success:false,message:"Mising Details"})
}
try{
    const user=await userModel.findById(userId)
    if(!user){
        return res.json({success:false,message:"user not found"})
    }
    if(user.verifyOtp!==otp || user.verifyOtp===''){
        return res.json({success:false,message:"Invalied OTP"})
    }
    if(user.verifyOtpExpireAt<Date.now()){
        return res.json({success:false,message:"Otp Expired"})
    }
    user.isAccountVerified=true;
    user.verifyOtp='';
    user.verifyOtpExpireAt=0;

    await user.save();

    return res.json({success:true,message:"Email verify successfully"})



}
catch(error){
    return res.json({success:false,message:error.message})
}

}


// check user is authenticated or not
export const isAuthenticated=async(req,res)=>{
    try{
        return res.json({success:true})

    }
    catch(error){
        res.json({success:false,message:error.message})
    }

}


// send Password Reset Otp
export const sendResetOtp=async(req,res)=>{
    const {email}=req.body;
    if(!email){
        return res.json({success:false,message:"Email is required"})
    }
    try{
        const user=await userModel.findOne({email})
        if(!user){
            return res.json({success:false,message:"user not found"})
        }
        const otp=  String( Math.floor(100000  +Math.random() * 900000))

    user.resetOtp=otp;

 user.resetOtpExpireAt=Date.now()+15*60*1000
 await user.save()
 const mailOption={
    from :process.env.SENDER_EMAIL,
            to:user.email,
            subject:'Password reset Otp',
            //text:`your otp for resetting your password is ${otp} and use this otp and procced with resettting the password`
            html:EMAIL_VERIFY_TEMPLATE.replace("{{otp}}",otp).replace("{{email}}",user.email)

 }
 await transporter.sendMail(mailOption)
 return res.json({success:true,message:"opt is send on your mail"})

    }
    catch(error){
      return res.json({success:false,message:error.message}) 
    }
}


// reset user password
export const resetPassword=async(req,res)=>{
    const{email,otp,newPassword}=req.body;
    if(!email|| !otp || !newPassword){
        return res.json({success:false, message:"Email , otp and newPassword are require"})
    }
    try{
        const user=await userModel.findOne({email})
        if(!user){
            return res.json({success:false,message:"user not found"})
        }
        if(user.resetOtp==="" || user.resetOtp!==otp){
            return res.json({success:false,message:"Invalied otp"})
        }
        if(user.resetOtpExpireAt<Date.now()){
            return res.json({success:false,message:"Otp is Expired"})
        }
        const hashedPassword=await bcrypt.hash(newPassword,10)
        user.password=hashedPassword;
        user.resetOtp='';
        user.resetOtpExpireAt=0;

        await user.save()
        return res.json({success:true,message:"password has been reset successfully"})

    }
    catch(error){
        return res.json({success:false,message:error.message})
    }
}