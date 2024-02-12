# Content Management System

This smart contract is a decentralized content management system built on the Internet Computer (IC) using Azle. The system allows authors to create articles, allows editors to publish the articles created by authors, and allows admins to manage users and categories.

You can always refer to [The Azle Book](https://demergent-labs.github.io/azle/) for more in-depth documentation.

## Requirements

- [Node.js](https://nodejs.org/en/)
- [IC SDK](https://internetcomputer.org/docs/current/developer-docs/setup/quickstart)

## Installation

Clone this repository:

```bash
git clone https://gitlab.com/dvcode.tech/icp-hub/icp-hub-cms-azle
cd icp-hub-cms-azle
```

`dfx` is the tool you will use to interact with the IC locally and on mainnet. If you don't already have it installed:

```bash
npm run dfx_install
```

Next you will want to start a replica, which is a local instance of the IC that you can deploy your canisters to:

```bash
npm run replica_start
```

If you ever want to stop the replica:

```bash
npm run replica_stop
```

Now you can deploy your canister locally:

```bash
npm install
npm run canister_deploy_local
```

To call the methods on your canister:

```bash
npm run canister_call <METHOD_NAME>
```

Assuming you have [created a cycles wallet](https://internetcomputer.org/docs/current/developer-docs/quickstart/network-quickstart) and funded it with cycles, you can deploy to mainnet like this:

```bash
npm run canister_deploy_mainnet
```

## Methods

- **initOwner**: This method is used to initialize the owner of the contract.
- **createUser**: This method is used to create a new user. There are two valid user roles, `author` for users who creates the articles and `editor` for editing and approval of the articles.
- **updateUser**: This method is used to update the user's role. Only the owner of the contract can use this method.
- **getMe**: This method is used to retrieve the current user.
- **createArticle**: This method is used to create a new article. Only users with the `author` role can use this method.
- **updateArticle**: This method is used to update an article. The `author` can indefinitely edit the article as long as the editorId is None.
- **getActiveArticles**: This method is used to retrieve all active articles.
- **getInactiveArticles**: This method is used to retrieve all inactive articles. Only `editor` can use this method.
- **getAllArticles**: This method is used to retrieve all articles. Only the owner of the contract can use this method.
- **getAllCategories**: This method is used to retrieve all categories.
- **createCategory**: This method is used to create category. Only the owner of the contract can use this method.
- **getActiveArticlesByCategory**: This method is used to retrieve articles by categoryId.

## License

This smart contract is licensed under MIT License. Please see the [LICENSE](./LICENSE) for more information.
