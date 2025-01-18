# Slack Archiver

A Slack app that allows you to archive all Slack messages to an external database, both retroactively and in real time.

This will run a Node server using PM2 process manager. Feel free to run it directly or using another launcher, however some of the setup steps will no longer be relevant to you.

---
## Requirements

- Node v20.9.0
- NVM v10.9.0
- Postgres 14.13
- Slack user account with Admin role
- 
---
## Installation
### Server set up
1. Run  
    ````
   npm install  
   
2. In your Postgres create database called `slack_archive`
3. Duplicate `.env-template` file in the root folder and rename to `.env` 
4. In `.env` adjust value of `PORT` to what port you want to run the Node server
5. In `.env` adjust database connection string at `DATABASE_URL` to work for your server
6. In `.env` adjust value of `MAX_DOWNLOAD_FILE_SIZE_KB` to your preference. Files larger that this value will not be downloaded to your server's file system (however will still be added to the `file` database table)
7. Replace all instances of [[WORKSPACE]] with your workspace's actual name, in ALL CAPS.
7. Choose one of the `ecosystem.config.*.cjs` files:  
   - `development` will run node using `tsx watch` against the `src` folder, auto restarting on file changes. Handy for development and debugging.
   - `production` will run the compiled Javascript in `dist` folder. More performant.
   - In your chosen ecosystem file, adjust the value of `port` to the port of your Node instance.
   - If using the production config, run
   ```` 
   npm run build
   ```` 
   - Start the server with `pm2 reload ecosystem.config.[production|environment].cjs`
   - Run `pm2 log` to make sure the server is running with no errors.
   - Test by calling *https://yourseveraddress.net/test*
8. Run  
   ````
   npm run migrate

### Slack App set up
8. Log into Slack, go to https://api.slack.com/apps/
9. Click "Create New App" button, select "From scratch"
10. Enter "Archiver" as App Name, and select the workspace to which you want to add the app
11. Click Create App button.

#### Basic information
12. You will start out in the *Settings -> Basic Information* page. On that page you will see the Verification Token. Copy the value of that token, and add to your `.env` file for `SLACK_VERIFICATION_TOKEN_YOURWORKSPACE`.
13. Scroll down to Display Information, enter a Short description (whatever you want, but I'd advise to use the first sentence of this README file)
14. (Optional) Add an Icon for your app and choose a Background color
15. Click **Save Changes** at the bottom of the page

#### OAuth & Permissions
16. Go to the *Features -> OAuth & Permissions* page, scroll down to the Scopes section. Add the following scopes:
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
17. Go to *Features -> Event Subscriptions* page. Click the switch to Enable Events
18. For Request URL, enter `https://yourserveraddress.net/webhook?workspace=yourworkspacename` substituting with your actual URL and workspace name. Immediately Slack will verify the URL is working
19. Expand the *Subscribe to events on behalf of users* panel. There, add the following events:
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
20. Click **Save Changes** button at the bottom of the page.
21. Finally, go to  *Settings -> Install App* page, and there click the **Install to {yourworkspace}** button. Your Slack app is now ready.

## Finish Configuration
22. Now that your Slack app is installed, you can finish setting all the required environment variables inside your `.env` file.
While still at the *Settings -> Install App* page, copy over the following values:  
   - **User OAuth Token** as `SLACK_USER_TOKEN_YOURWORKSPACE`    
   - **Bot User OAuth Token** as `SLACK_VERIFICATION_TOKEN_YOURWORKSPACE`  
      
  
23. (Optional) For `SLACK_IGNORED_CHANNELS_YOURWORKSPACE`, you can add a comma-separated list of channels you never want to archive. 
24. For `SLACK_ALERTS_CHANNEL_YOURWORKSPACE` enter the name of a channel where you want to generate alert and error messages, in the case of the server encountering an error while archiving. 

### Slack Bot set up
25. In your Slack, refresh the main window. You should now see the *Archiver* bot listed under the list of Apps, at the bottom left.
26. You need to manually add the bot to each channel that you want to have archived. You do this with the `/add` command in each channel.   
This step is only needed for retroactive archiving. For real-time archiving, the bot will by default archive all public and private channels*

## Retroactive Archiving

27. In order to archive all past messages, you need to run an NPM script. This script will archive 1 channel at a time, so will need to be called once for every channel you want to add to the archive  
Usage: `npm run saveMessages -- [yourworkspace] [--channel|--user]`




***IMPORTANT:** Direct messages are NEVER archived, for hopefully obvious reasons