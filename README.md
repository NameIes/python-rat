# Python RAT
[This repo](https://github.com/NameIes/python-rat)

A simple client/server application for tracking clients activity, with the ability to take screenshots and view a list of tasks.

## Server
Web application written in Python and the django framework.
### How to start local server
```
cd server
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

## Client
Application written in Javascript using NodeJS and ElectronJS.
### Installing dependencies
```
cd client
npm install
```
### Configuring client
For configuring, change parameters at the bottom of `main.js`.

`server_url` - `string` - Link to server with django application.

`show_window` - `boolean` - If `true` show a window for quick closing during development.

`enable_autoload` - `boolean` - Add application to startup.
### Start application without building
```
npm start
```
### Build application
```
npm i -g electron-builder
electron-builder --win
```
After executing these commands, the built application will be located in the `.../client/dist` folder.
