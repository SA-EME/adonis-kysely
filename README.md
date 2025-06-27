<h1 align="center">Adonis kysely package</h1>
`adonis-kysely` package is a package for easy configuration of [kysely](https://github.com/kysely-org/kysely) on [adonisjs](https://github.com/adonisjs).

## WIP: This project is currently under development, with no version available at the moment.
If you want to try out the package, you can compile it from this repository.
It only works with PostgreSQL.

## Usage
### 1. Clone the repository

```sh
git clone https://github.com/SA-EME/adonis-kysely
cd adonis-kysely
```

### 2. Build the project

```sh
npm install
npm run build
npm pack
```

It generates a file like this _adonis-kysely-x.x.x.tgz_

### 3. Install the package under your project

```sh
npm install adonis-kysely-x.x.x.tgz
```

### 4. Configure the package

```
node ace configure adonis-kysely
```

For the moment, you need to add this configuration to the tsconfig.json file, in order to obtain the type from the database.

```json
{
  "compilerOptions": {
    "paths": {
      "adonis-kysely/types/db": ["./types/db.ts"]
    }
  }
}
```

You need to generate the type from your database
- Modify `DATABASE_URL` in .env file

And run the command to generate the type
```sh
npx kysely-codegen --out-file=types/db.ts
```

### 5. Use the package

```javascript
import kyselyDB from 'adonis-kysely/services/main'

const user = await kyselyDB.getConnexion().selectFrom('users').selectAll().execute()
```