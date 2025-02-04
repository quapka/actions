# rs-permission-converter

This GitHub Action converts a permission.xml file into sql file or into resx files. It is the xml file that is the master when adding new access rights and translations.

## Usage

See [action.yml](action.yml).

### Secrets

The following environment variables are required:

* `NEXUS_USERNAME`: user for [repo.extendaretail.com](https://repo.extendaretail.com)
* `NEXUS_PASSWORD`: password for [repo.extendaretail.com](https://repo.extendaretail.com)

### Basic Usage

This example generates sql file and resx files

```yaml
on: push
jobs:
  build:
    runs-on: windows-latest

    steps:
      - uses: actions/checkout@master  

      - name: Create sql file from permission xml
        uses: extenda/actions/rs-permission-converter@v0
        with:
          type: sql
          tool-version: 1.0.1
          work-directory: .
          permission-file: RS.Security.Resources\Permissions.xml
          sql-file: RS.Security.Resources\DatabaseScripts\R__Permissions.sql
        env:
          NEXUS_USERNAME: ${{ secrets.NEXUS_USERNAME }}
          NEXUS_PASSWORD: ${{ secrets.NEXUS_PASSWORD }}

      - name: Create resx file from permission xml
        uses: extenda/actions/rs-permission-converter@v0
        with:
          type: resx
          tool-version: 1.0.1
          work-directory: .
          permission-file: RS.Security.Resources\Permissions.xml
          output-dir: RS.Security.Resources\Resources
        env:
          NEXUS_USERNAME: ${{ secrets.NEXUS_USERNAME }}
          NEXUS_PASSWORD: ${{ secrets.NEXUS_PASSWORD }}
```
