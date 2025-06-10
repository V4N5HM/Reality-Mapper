# DiabAI (8. Healthcare AI Project)

## Structure
- `logs`: Folder for weekly meeting logs.
- `README.md`: Update with details according to the checklist below.
- `codebase`: Folder for maintaining the code.
- Additional folders can be added as necessary—ensure to update the structure here.

## Members
- `48207052` - **Vansh Mittal**
- `47787717` - **Norman Teik Wei Yap**
- `48287577` - **Hewen Zheng**
- `47323254` - **Reona Nakagawa**
- `48315162` - **Jinwen Hu**

## Deploy/Running Instructions

### How to Start DiabAI locally

#### 1. Install Node.js
Ensure Node.js is installed as Vite requires it. You can download it from the [Node.js official website](https://nodejs.org).

- **Check Node.js installation**:
    ```bash
    node -v
    ```
    This will output the Node.js version number if it's installed.

- **Check npm installation**:
    ```bash
    npm -v
    ```
    This will output the npm version, which is bundled with Node.js.


#### 2. Navigate into the Project Directory
After the setup is complete, navigate into the project directory:
```bash
cd /codebase/frontend
```

#### 3. Install Dependencies
Install the project dependencies by running:
```bash
npm install
```

#### 4. Start the Development Server
Once the dependencies are installed, you can start the Vite development server using:
```bash
npm run dev
```

Vite will start a local development server (usually on port 5173). The terminal will display the local and network URLs where the app is available. You can open the app in your browser at [http://localhost:5173](http://localhost:5173).


When launching from the EHR or the SMART Launcher [https://launch.smarthealthit.org/]
- copy the link obtained when running the app into the SMART Launcher, it will almost certainly be [http://localhost:5173/]
- select diabetic patients
- click "Launch"
- the selected patient(s) should be projected into DiabAI 

#### 5. Build for Production
To build the app for production, run:
```bash
npm run build
```

Ensure that all necessary libraries and dependencies are installed during this process.

The app is also deployed using vercel and can be accessed using this link:
[https://diabai.vercel.app]


--- 

This should give your team a clean and organized starting point!
