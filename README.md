# ioBroker.webui

webui for ioBroker

![image](https://user-images.githubusercontent.com/364896/147159584-e0e43d37-9e63-409d-867b-458c5dd8be4e.png)

## Developing

  * Install dependencies
```
  $ npm install
```

  * Compile Typescript after doing changes
```
  $ npm run build
```

  * Run the app in a local server
```
  $ npm start --prefix www
```

  * Navigate Chrome to [localhost:8000]() to see the app.

## Info about the Adapter.

The Adapter is based on the following Designer component:
https://github.com/node-projects/web-component-designer

It's only an early beta. At the moment it communicates with "Admin" on Port "8081", but this will be fixed.

You need to create a screen "start", this is the first one called when you open runtime.html, but you can change this via query parameter:
runtime.html?screenName=screen2

## Changelog
<!--
	Placeholder for the next version (at the beginning of the line):
	### __WORK IN PROGRESS__
-->
### 0.0.10 (2021-12-21)
* initial version

## License
The MIT License (MIT)

Copyright (c) 2021 jogibear9988 <jochen.kuehner@gmx.de>
