import {User} from "../models/user.models.js"
import { ApiResponse } from "../utils/api-response.js"
import {ApiError} from "../utils/api-error.js"
import { asyncHandler } from "../utils/async-handler.js"
import {emailVerificationMailgenContent, forgotPasswordMailgenContent, sendEmail} from "../utils/mail.js"
import { verifyJWT } from "../middlewares/auth.middleware.js"
import jwt from "jsonwebtoken"
import crypto from "crypto"


const generateAccessAndRefreshTokens=async(userId)=>{
    try {
        const user=await User.findById(userId)
        const accessToken=user.generateAccessToken();
        const refreshToken=user.generateRefreshToken();

        user.refreshToken=refreshToken
        await user.save({validateBeforeSave:false})
        return{accessToken,refreshToken}
    } catch (error) {
        throw new ApiError(500,"Something went wrong while generating access token")   
    }
}

const registerUser=asyncHandler(async (req,res)=>{
    const {email,username,password,role}=req.body

    const existedUser=await User.findOne({
        $or:[{username},{email}]
    })
    if(existedUser){
        throw new ApiError(409,"User with usename or email alredy exists",[])
    }

    const user=await User.create({
        email,
        password,
        username,
        isEmailVerified:false
    })

    const {unHashedToken,hashedToken,TokenExpiry}=
       user.generateTemporaryToken()

       user.emailVerificationToken=hashedToken
       user.emailVerificationExpire=TokenExpiry

       await user.save({validateBeforeSave:false})

       await sendEmail({
        email:user?.email,
        subject:"Please verify ur email",
        mailgenContent:emailVerificationMailgenContent(
            user.username,
            `${req.protocol}://${req.get("host")}/api/v1/users/verify-email/${unHashedToken}`
        ),
       })

       const createdUser=await User.findById(user._id).select(
        "-password -refreshToken -emailVerificationToken -emailVerificationExpire"
       )

       if(!createdUser){
        throw new ApiError(500,"Something went wrong while registering the user")
       }

       return res
       .status(201)
       .json(
        new ApiResponse(
            200,
            {user:createdUser},
            "User registered successfully and verification email has been sent to ur email"
        )
       )

})

const login=asyncHandler(async(req,res)=>{
    const {email,password}=req.body

    const user=await User.findOne({email})

    if(!user){
        throw new ApiError(400,"User does not exists")
    }

    const isPasswordValid= await user.isPasswoerdCrrt(password)

    if(!isPasswordValid){
        throw new ApiError(400,"Email or Password is Invalid")
    }

    const {accessToken,refreshToken}=await generateAccessAndRefreshTokens(user._id)

    const loggedInUser=await User.findById(user._id).select(
        "-password -refreshToken -emailVerificationToken -emailVerificationExpire"
    )

    const options={
        httpOnly:true,
        secure:true,
    }

    return res
       .status(200)
       .cookie("accessToken",accessToken,options)
       .cookie("refreshToken",refreshToken,options)
       .json(
          new ApiResponse(
            200,
            {
                user:loggedInUser,
            },
            "User logged in successfully"
          )
        )
})

const logoutUser=asyncHandler(async(req,res)=>{
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set:{
                refreshToken:""
            }
        },
        {
            new:true
        },
    );
    const options={
        httpOnly:true,
        secure:true
    }
    return res
      .status(200)
      .clearCookie("accessToken",options)
      .clearCookie("refreshToken",options)
      .json(
        new ApiResponse(200,{},"USer logged out")
      )
}) 

const getCurrentUser=asyncHandler(async(req,res)=>{
    return res
    .status(200)
    .json(new ApiResponse(200,req.user,"Current user fetched Successfully"))
})

const verifyEmail=asyncHandler(async(req,res)=>{
    const {verificationToken}=req.params

    if(!verificationToken){
        throw new ApiError(400,"Email verification token is missing")
    }

    let hashedToken=crypto
       .createHash("sha256")
       .update(verificationToken)
       .digest("hex")

    const user=await User.findOne({
        emailVerificationToken:hashedToken,
        emailVerificationExpire:{$gt:Date.now()}
    })  
    if(!user){
      throw new ApiError(400,"Token is invalid or expired")
    }

    user.emailVerificationToken=undefined
    user.emailVerificationExpire=undefined

    user.isEmailVerified=true
    await user.save({validateBeforeSave:false})
    
    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                {
                    isEmailVerified:true
                },
                "Email is Verified"
            )
        )
})

const resendEmailVerification=asyncHandler(async(req,res)=>{
    const user=await User.findById(req.user?._id);

    if(!user){
        throw new ApiError(404,"User does not exist")
    }

    if(user.isEmailVerified){
        throw new ApiError(409,"Email is already Verified");
    }

    const {unHashedToken,hashedToken,TokenExpiry}=
       user.generateTemporaryToken()
       

       user.emailVerificationToken=hashedToken
       user.emailVerificationExpire=TokenExpiry

       await user.save({validateBeforeSave:false})

       await sendEmail({
        email:user?.email,
        subject:"Please verify ur email",
        mailgenContent:emailVerificationMailgenContent(
            user.username,
            `${req.protocol}://${req.get("host")}/api/v1/users/verify-email/${unHashedToken}`
        ),
       })
    return res
       .status(200)
       .json(
        new ApiResponse(
            200,
            {},
            "Mail has been sent to your email Id"
        )
       )   
})

const refreshAccessToken=asyncHandler(async(req,res)=>{
    const incomingRefreshToken=req.cookies?.refreshToken || req.body?.refreshToken

    if(!incomingRefreshToken){
        throw new ApiError(401,"Unauthorized Access")
    }

    try {
      const decodedToken=jwt.verify(incomingRefreshToken,process.env.REFRESH_TOKEN_SECRET)

      const user=await User.findById(decodedToken?._id);

      if(!user){
        throw new ApiError(401,"Inavlid refresh token")
      }

      if(incomingRefreshToken !== user?.refreshToken){
         throw new ApiError(401,"Refresh token is Expired")
      }

      const options={
        httpOnly:true,
        secure:true
      }

      const {accessToken,refreshToken:newRefreshToken}=await generateAccessAndRefreshTokens(user._id)

      user.refreshToken=newRefreshToken
      await user.save()

      return res
        .status(200)
        .cookie("accessToken",accessToken,options)
        .cookie("refreshToken",newRefreshToken,options)
        .json(
            new ApiResponse(
                200,
                {accessToken,refreshToken:newRefreshToken},
                "Access token refreshed"
            )
        )
    } catch (error) {
        throw new ApiError(401,"Invalid refresh token")
    }
})

const forgotPassword=asyncHandler(async(req,res)=>{
    const {email}=req.body;

    const user=await User.findOne({email})

    if(!user){
        throw new ApiError(404,"User does not exist")
    }

    const {unHashedToken,hashedToken,TokenExpiry}=user.generateTemporaryToken()

    user.forgotPasswordToken=hashedToken;
    user.forgotPasswordExpire=TokenExpiry;

    await user.save({validateBeforeSave:false})

     await sendEmail({
        email:user?.email,
        subject:"Password reset request",
        mailgenContent:forgotPasswordMailgenContent(
            user.username,
            `${process.env.FORGOT_PASSWORD_REDIRECT_URL}/${unHashedToken}`
        ),
       })

       return res
          .status(200)
          .json(
            new ApiResponse(
                200,
                {},
                "Password resend mail has been send to ur mail "
            )
          )

})

const resetForgotPassword=asyncHandler(async(req,res)=>{
    const {resetToken}=req.params
    const {newPassword}=req.body

    let hashedToken=crypto
       .createHash("sha256")
       .update(resetToken)
       .digest("hex")

    const user=await User.findOne({
        forgotPasswordToken:hashedToken,
        forgotPasswordExpire:{$gt:Date.now()}
    })
    
     if(!user){
        throw new ApiError(400,"Token is invalid or expired")
    }

    user.forgotPasswordExpire=undefined
    user.forgotPasswordToken=undefined

    user.password=newPassword
    await user.save({validateBeforeSave:false})

     return res
          .status(200)
          .json(
            new ApiResponse(
                200,
                {},
                "Password rest successfully"
            )
          )
    
}) 

const changeCurrentPassword=asyncHandler(async(req,res)=>{
    const {oldPassword,newPassword}=req.body

    const user=await User.findById(req.user?._id)

    const isPasswordValid=await user.isPasswoerdCrrt(oldPassword)

    if(!isPasswordValid){
        throw new ApiError(400,"Inavlid old Password")
    }

    user.password=newPassword
    await user.save({validateBeforeSave:false})

    return res
          .status(200)
          .json(
            new ApiResponse(
                200,
                {},
                "Password changed successfully"
            )
          )
})



export {
    registerUser,
    login,
    logoutUser,
    getCurrentUser,
    verifyEmail,
    resendEmailVerification,
    refreshAccessToken,
    forgotPassword,
    resetForgotPassword,
    changeCurrentPassword
}


