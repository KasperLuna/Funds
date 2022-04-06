# Finance (fih·nan·chy)
 Finance Tracker WebApp Monorepo
 
 This repository houses both the front and backend of the finance tracker webapp.
 
 ### Requirements
 1. [**VSCode**](https://code.visualstudio.com/download) for Development
 2. [**NodeJS**](https://nodejs.org/en/) (runtime)
 3. [**PNPM**](https://pnpm.io/installation) (package manager)
 
 ## Getting Started
To begin development, you need to clone this repository and install dependencies.

```
git clone https://github.com/KasperLuna/Finance.git
cd Finance
pnpm install
```


### Dev Dependencies 
Installed via VSCode Extensions
 1. **ESLint**
 2. **Prettier**
 3. (Optional) Blockman

## Running the App
The app's front and backend can be run concurrently (parallel) or individually.

### Running Concurrently
```
pnpm run dev
```

### Backend Only
```
cd finance-backend
pnpm start
```

### Frontend Only
```
cd finance-frontend
pnpm run dev
```
