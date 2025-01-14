# External events GitHub Action

This GitHub action synchronises 'external events' config with `External events` service.
# Usage

See [action.yml](action.yml)

# Common repo setup

This action is used to sync `EXE` configuration from your repo with `EXE Service`.

Expected structure of our common repo:

At the root of repo you should create directory `external-events`.
Under that directory you can have multiple `*.yaml`
Each `system-prefix` in each file must be unique.

Example (external-events/iam.yaml)
```yaml
version: 1 # (required) always 1 for now
# id for event source is generated from template {system}.{name}.{version}
system-prefix: iam # (required) (part of generated id)
event-sources: # (required) list of event sources for your system
  - name: group-created # (required) name of the event source (part of generated id)
    version: v1 # (required) version of event source (part of generated id)
    display-name: IAM Group was created # (required) human readable name for event source
    # (required)
    # push subscription that will push events to external event dispatch API
    # TODO: replace link with internal doc link, that will explain how to push events.
    # (doc) https://developer.hiiretail.com/docs/exe/public/concepts/EVENT-SOURCE
    subscription-name: projects/iam-prod-4aad/subscriptions/iam.public.output.events.v1+iam.group-created
    # (required) content type of data from subscription above. usually application/json
    content-type: application/json
    # (optional, default - false)
    # removing of event sources is not supported for now. instead you can disable it.
    # event source will still work, but it will not be available for new webhooks
    disabled: true
  - name: group-created
    version: v2
    display-name: IAM Group was created
    subscription-name: projects/iam-prod-4aad/subscriptions/iam.public.output.events.v2+iam.group-created
    content-type: application/json
  - name: group-updated
    version: v1
    display-name: IAM Group was updated
    subscription-name: projects/iam-prod-4aad/subscriptions/iam.public.output.events.v1+iam.group-updated
    content-type: application/json
```

# Action setup example

.github/workflows/exe.yml
```yaml
name: External events
on:
  push:
    paths: external-events/*.yaml

jobs:
  prod:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v1

      - name: External events sync
        uses: extenda/actions/external-events@v0
        with:
          service-account-key: ${{ secrets.SECRET_AUTH }}
          definitions: external-events/*.yaml # default is `external-events/*.yaml`
          dry-run: ${{ github.ref != 'refs/heads/master' }}
```
