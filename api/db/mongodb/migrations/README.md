### Important

golang-migrate for mongoDB uses `db.runCommand( { <command> } )` syntax: https://www.mongodb.com/docs/manual/reference/command/

https://pkg.go.dev/github.com/golang-migrate/migrate/v4/database/mongodb#section-readme


### Query logs collections

Note: Query logs time series collections and their indexes creation is currently handled by proxy service.
