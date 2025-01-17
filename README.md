# Slack Archiver

A Slack app that allows you to archive all Slack messages to an external database, both retroactively and in real time.

This will run a Node server using PM2 process manager. Feel free to run it directly or using another launcher, however some of the setup steps will no longer be relevant to you.

If you come across any inaccuracies with these installation steps, reach out to me.

---
## Requirements

- Node v20.9.0
- NVM v10.9.0
- Postgres 14.13
- Slack user account with Admin role

## Why? What about Slack's built-in export tool?
There is that, but it's quite simplistic and limited. 
- It only exports on demand, will not run in the background and keep archiving for every message posted moving forward
- No possibility to filter out channels
- It outputs JSON straight from Slack API which then requires translation into a more readable and queryable format
- It doesn't download the actual files (just provides the URLs for download links)

## Disclaimer

By using this software, you assume all liabilities regarding any possible violations of GDPR or other data privacy mandates that your implementation of this software might create. You are responsible to obtain full consent from all the parties that would be affected, as well as properly securing and restricting access to the database. Use this software entirely at your own risk.

---
## Installation
### Server set up
1. Run  
    ````
   npm install
   ````  
   
2. In your Postgres create database called `slack_archive` 
3. Choose one of the `ecosystem.config.*.cjs` files:  
   - `development` will run node using `tsx watch` against the `src` folder, auto restarting on file changes. Handy for development and debugging.
   - `production` will run the compiled Javascript in `dist` folder. More performant.
   - In your chosen ecosystem file, adjust the value of `port` to the port of your Node instance.
4. If using the production config, run
   ```` 
   npm run build
   ```` 
5. Start the server with  
   ````
   pm2 load ecosystem.config.[production|development].cjs
   ````
   Run `pm2 log` to make sure the server is running with no errors.  
   Test the API by calling *https://yourseveraddress.net/test*  

6. Run  
   ````
   npm run migrate
   ````

###  Initial Configuration
1. Duplicate `.env-template` file in the root folder and rename to `.env`

In your `.env` file:
2. Adjust value of `PORT` to what port you want to run the Node server
3. Adjust database connection string at `DATABASE_URL` to work for your server
4. Adjust value of `MAX_DOWNLOAD_FILE_SIZE_KB` to your preference. Files larger that this value will not be downloaded to your server's file system, however will still be added to the `file` database table (defaults to 100000KB / 100MB)
5. Adjust value of `FILES_DOWNLOAD_DIRECTORY` to where on your server filesystem you want the files to be downloaded (defaults to `files` folder inside the app root directory)

###  Workspace-specific Configuration
1. Replace all instances of [[WORKSPACE]] with your workspace's actual name, in ALL CAPS.
2. For `SLACK_IGNORED_CHANNELS_YOURWORKSPACE`, you can add a comma-separated list of channels in your workspace you never want to archive.
3. For `SLACK_ALERTS_CHANNEL_YOURWORKSPACE`, enter the name of a channel where you want to generate alert and error messages, in the case of the server encountering an error while archiving (defaults to `alerts`).

### Slack App set up
1. Log into Slack, then go to https://api.slack.com/apps/.
2. Click "Create New App" button, select "From scratch".
3. Enter "Archiver" as App Name, and select the workspace to which you want to add the app.
4. Click Create App button.

#### Basic information
5. You will start out in the *Settings -> Basic Information* page. On that page you will see the Verification Token. Copy the value of that token, and add to your `.env` file as the value for `SLACK_VERIFICATION_TOKEN_YOURWORKSPACE`.
6. Scroll down to *Display Information*, enter a Short Description (whatever you want, e.g. "Archive all Slack messages to an external database").
7. (Optional) Add an Icon for your app and choose a Background color.
8. Click **Save Changes** at the bottom of the page.

#### OAuth & Permissions
9. Go to the *Features -> OAuth & Permissions* page, scroll down to the Scopes section. Add the following scopes:
   - For **Bot Token Scopes**:
     - channels:history
     - channels:read
     - chat:write
     - chat:write.public
     - files:read
     - groups:history
     - groups:read
     - users:read
   - For **User Token Scopes**:
      - channels:history
      - channels:read
      - files:read
      - groups:history
      - groups:read
      - users:read

#### Event Subscriptions
10. Go to *Features -> Event Subscriptions* page. Click the switch to Enable Events.
11. For Request URL, enter `https://yourserveraddress.net/webhook?workspace=yourworkspacename` substituting with your actual URL and workspace name. Immediately Slack will verify the URL is working.
12. Expand the *Subscribe to events on behalf of users* panel. There, add the following events:
    - channel_archive 
    - channel_created
    - channel_deleted
    - channel_rename
    - channel_unarchive
    - group_archive
    - group_deleted
    - group_open
    - group_rename
    - group_unarchive
    - message.channels
    - message.groups
    - groups:history
    - team_join
13. Click **Save Changes** button at the bottom of the page.
14. Finally, go to  *Settings -> Install App* page, and there click the **Install to {yourworkspace}** button. Your Slack app is now ready.

### Finish Configuration
Now that your Slack app is installed, you can finish setting all the required environment variables inside your `.env` file.
While still at the *Settings -> Install App* page, copy over the following values:  
   - **User OAuth Token** as `SLACK_USER_TOKEN_YOURWORKSPACE`    
   - **Bot User OAuth Token** as `SLACK_BOT_TOKEN_YOURWORKSPACE`  

### Slack Bot set up
1. In your Slack, refresh the main window. You should now see the *Archiver* bot listed under the list of Apps, at the bottom left.
2. **This step is only needed for retroactive archiving.** Add the bot to each channel that you want to have archived. You do this with the `/add` command in each channel.  This is not needed for real-time archiving, since the bot will by default archive all public and private channels.*

***IMPORTANT:** Direct messages are never archived, for hopefully obvious reasons.

## Retroactive Archiving

In order to archive all past messages, you need to run an NPM script. This script will archive 1 channel at a time, so will need to be called once for every channel you want to add to the archive.  
Usage:  
````
npm run saveMessages -- [workspace] [channelname] [[-limit]] [[-latest]] 
````
Where `workspace` is the name of your workspace and `channelName` is the name of the channel. The optional flags `-limit` and `-latest` allow archiving for a slice of your history (archiving always happens in reverse chronological order). `-limit` specifies the number of records you want to archive, and `-latest` accepts a Slack-style timestamp (which consists of regular Unix timestamp + a decimal point followed by a 6-digit UID). Partial archiving is handy in the case that the job happens to fail partway through due to e.g. network issue. You can resume the process from where you left off instead of starting all over.  

### Examples:
Archive all messages from the `random` channel of `yourworkspace`
````
npm run saveMessages -- yourworkspace random 
````

Archive all messages from before 2025 from the `random` channel of `yourworkspace`
````
npm run saveMessages -- yourworkspace random -latest 1735686000.000000
````

Archive the latest 1000 messages from the `random` channel of `yourworkspace`
````
npm run saveMessages -- yourworkspace random -limit 1000
````

### Other scripts
#### List messages
Lists messages from a given channel. Essentially the exact same console output as `saveMessages`, but without actually writing to database or downloading files.

````
npm run listMessages -- [workspace] [channelname] [[-limit]] [[-latest]] 
````

#### Archive users
Saves all users to the `user` table.
````
npm run saveUsers -- [workspace] 
````

#### List users
Outputs all users in the workspace to the console.
````
npm run listUsers -- [workspace] 
````

#### List channels
Outputs all channels in a workspace to the console.

````
npm run listChannels -- [workspace] 
````

There are a few other utility scripts available as well, go to the script inside `package.json` to see them all. 

---

## Multiple Workspaces

You can archive any number of workspaces using the one instance. To do this, simply repeat all the steps starting from **Workspace-specific Configuration** and downwards. 

## Goals

The one glaring omission is an API + user interface to view and search through the archive. I haven't had any time for this - it definitely would require some robust user authentication plus a load of data privacy considerations on top of the ones that this software already creates.

If you're up to the task to build out an API or frontend (or both), fork this repo, and have at it.