# rektalert

Get Telegram notifications if orders are filled. Compatible with the FTX Crypto Derivatives Exchange.

## Preperation

There a two parts you need to set up once. Your own private telegram bot that will send you the alert messages and a read-only api key in you FTX account.

**Setting your own private Telegram Bot**

1. Open telegram and start a chat with [https://t.me/botfather](BotFather)
2. Send `/newbot` and answer the questions by BotFather
3. Note the **Token** that BotFather gives you in the success message

**Generating a read-only api key in FTX**

1. Log into FTX and click on your username at the top right corner, select `Settings`
2. Scroll down to the API Keys section and click `CREATE READ-ONLY API KEY`
3. Note the **API Key** and **API Secret**

## Windows: Setup and running rektalert for the first time.

You can run rektalert on your Windows PC as follows:

1. Download the compiled binaries (rektalert.exe and keytar.node) from the dist folder [Windows version](./dist/win).
2. Open a cmd and *cd* into the directory where rektalert.exe is located and start run this command:
```cmd
rektalert.exe setup
```
3. Press enter to select `Set Telegram Token`.
4. Enter the **Token** that you got from BotFather earlier.
5. Repeat the command from step 2. (`rektalert.exe setup`).
6. This time choose `Add FTX Api Key`.
7. Enter the sub account name or just press enter if you're setting up alerts for your main account.
8. Enter the **API Key** you generated on FTX.
9. Enter the **API Secret**.
10. Now start rektalert for the first time:
```cmd
recktalert.exe monitor
```
11. Open a chat with your new telegram bot. You can use the link that BotFather spit out in the message with the token.
12. Send your bot the the message `/start`. It should answer with *Hello! You're now my master and I shall only report to you.*.

Now go into your FTX account and execute a small market order ($1 or so) to test if the alerts work.

**Important:** You have to keep the cmd window open to run rectalert for now. I'll release a GUI version that runs nicely in the background soon. If you don't want to wait you can use nssm.exe to register rektalert as a windows service.

Here's a snipped you can use to register rektalert with [nssm.exe](https://nssm.cc/release/nssm-2.24.zip). You need to execute those commands in a cmd with administrator rights. You can watch my tutorial video to see how it works: https://youtu.be/MG0AnfOB_AA

```cmd
.\nssm.exe install rektalert "C:\[PATH_TO_REKTALERT]\rektalert.exe" "monitor"
.\nssm.exe set rektalert AppStdout "C:\[PATH_TO_REKTALERT]\log.log"
.\nssm.exe set rektalert AppStderr "C:\[PATH_TO_REKTALERT]\error.log"
.\nssm.exe set rektalert AppStdoutCreationDisposition 4
.\nssm.exe set rektalert AppStderrCreationDisposition 4
.\nssm.exe set rektalert AppRotateFiles 1
.\nssm.exe set rektalert AppRotateOnline 1
.\nssm.exe set rektalert AppRotateBytes 1048576
```

You will have to edit the service to run as your user account or it won't be able to read the config file with the api keys and telegram token.
