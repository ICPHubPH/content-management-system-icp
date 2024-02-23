import {
  Canister,
  Err,
  None,
  Ok,
  Opt,
  Principal,
  Record,
  Result,
  StableBTreeMap,
  Variant,
  Vec,
  ic,
  nat64,
  bool,
  query,
  text,
  update,
} from "azle";
import { v4 as uuidv4 } from "uuid";

// Define user and ticket roles.
const USER_ROLE = ["editor", "author"];

// Initialize records.
const Owner = Record({
  id: Principal,
  createdAt: nat64,
  updatedAt: nat64,
});

const User = Record({
  id: Principal,
  name: text,
  role: text,
  status: bool,
  createdAt: nat64,
  updatedAt: nat64,
});

const Category = Record({
  id: text,
  name: text,
});

const Article = Record({
  id: text,
  title: text,
  date: nat64,
  description: text,
  content: text,
  editorId: text,
  authorId: text,
  categoryId: text,
  status: bool,
  createdAt: nat64,
  updatedAt: nat64,
});

const UserPayload = Record({
  name: text,
  role: text,
});

const UserUpdatePayload = Record({
  id: Principal,
  name: text,
  role: text,
  status: bool,
});

const ArticlePayload = Record({
  id: text,
  title: text,
  date: nat64,
  description: text,
  content: text,
  categoryId: text,
  status: bool,
});

// Initialize error variants.
const Error = Variant({
  NotFound: text,
  Unauthorized: text,
  Forbidden: text,
  BadRequest: text,
  InternalError: text,
});

// Initialize storages.
const ownerStorage = StableBTreeMap(0, Principal, Owner);
const userStorage = StableBTreeMap(1, Principal, User);
const articleStorage = StableBTreeMap(2, text, Article);
const categoryStorage = StableBTreeMap(3, text, Category);

function isOwner(caller: Principal): boolean {
  return ownerStorage.containsKey(caller);
}

export default Canister({
  /**
   * Initialize owner.
   * Returns the new owner.
   * Throws error if owner has already been initialized.
   * Throws error if any other error occurs.
   */
  initOwner: update([], Result(Principal, Error), () => {
    if (!ownerStorage.isEmpty()) {
      return Err({ BadRequest: `Owner has already been initialized` });
    }

    try {
      // Create new owner, insert it into storage and return it.
      const newOwner = {
        id: ic.caller(),
        createdAt: ic.time(),
        updatedAt: ic.time(),
      };
      ownerStorage.insert(ic.caller(), newOwner);
      return Ok(ic.caller());
    } catch (error) {
      // If any error occurs, return it.
      return Err({ InternalError: `${error}` });
    }
  }),
  /**
   * Create user.
   * Returns the new user.
   * Throws error if user already exists.
   * Throws error if role is not valid.
   * Throws error if any other error occurs.
   */
  createUser: update([text], Result(User, Error), (name) => {
    let currentPrincipal = ic.caller();

    try {
      // If user already exists, return error.
      if (userStorage.containsKey(currentPrincipal)) {
        return Err({ BadRequest: "You already have an account" });
      }
      // Create new user, insert it into storage and return it.
      const newUser = {
        id: currentPrincipal,
        name: name,
        role: "author",
        status: false,
        createdAt: ic.time(),
        updatedAt: ic.time(),
      };
      userStorage.insert(newUser.id, newUser);
      return Ok(newUser);
    } catch (error) {
      // If any error occurs, return it.
      return Err({ InternalError: `${error}` });
    }
  }),
  /**
   * Update user.
   * Returns the updated user.
   * Throws error if user does not exist.
   * Throws error if any other error occurs.
   * Only the owner can update the user.
   */
  updateUser: update([UserUpdatePayload], Result(User, Error), (payload) => {
    if (!isOwner(ic.caller())) {
      return Err({ Forbidden: "Action reserved for the contract owner" });
    }

    try {
      const user = userStorage.get(payload.id);
      userStorage.insert(user.Some.id, {
        ...user.Some,
        name: payload.name,
        role: payload.role,
        status: payload.status,
        updatedAt: ic.time(),
      });
      return Ok(user.Some);
    } catch (error) {
      // If any error occurs, return it.
      return Err({ InternalError: `${error}` });
    }
  }),
  /**
   * Get users.
   * Returns the users.
   * Throws error if any other error occurs.
   * Only the owner can get the users.
   */
  getUsers: query([], Result(Vec(User), Error), () => {
    if (!isOwner(ic.caller())) {
      return Err({ Forbidden: "Action reserved for the contract owner" });
    }
    try {
      const users = userStorage.values();
      return Ok(users);
    } catch (error) {
      // If any error occurs, return it.
      return Err({ InternalError: `${error}` });
    }
  }),
  /**
   * Get user.
   * Returns the user.
   * Throws error if user does not exist.
   * Throws error if any other error occurs.
   */
  getMe: query([], Result(User, Error), () => {
    let currentPrincipal = ic.caller();

    try {
      // If user does not exist, return error.
      if (!userStorage.containsKey(currentPrincipal)) {
        return Err({ Unauthorized: "Create an account first" });
      }

      // Return the current user.
      const user = userStorage.get(currentPrincipal);
      return Ok(user.Some);
    } catch (error) {
      // If any error occurs, return it.
      return Err({ InternalError: `${error}` });
    }
  }),
  /**
   * Create article.
   * Returns the new article.
   * Throws error if user does not exist.
   * Throws error if any other error occurs.
   * Only the activated user can create an article.
   * The status of the article will be false.
   * The author of the article will be the caller.
   * The createdAt and updatedAt will be the current time.
   * The content, description, name, and date will be provided by the payload.
   * The id will be a uuidv4.
   * The status will be false by default.
   * The authorId will be the caller.
   * The createdAt will be the current time.
   * The updatedAt will be the current time.
   */
  createArticle: update([ArticlePayload], Result(Article, Error), (payload) => {
    let currentPrincipal = ic.caller();

    try {
      // If user does not exist, return error.
      if (!userStorage.containsKey(currentPrincipal)) {
        return Err({ Unauthorized: "Create an account first" });
      }

      const user = userStorage.get(currentPrincipal);

      if (!user.Some.status) {
        return Err({ Forbidden: "Account is currently deactived" });
      }

      // Create new event, insert it into storage and return it.
      const newArticle = {
        id: payload.id.length > 0 ? payload.id : uuidv4(),
        title: payload.title,
        date: payload.date,
        description: payload.description,
        content: payload.content,
        categoryId: payload.categoryId,
        authorId: currentPrincipal.toText(),
        editorId: currentPrincipal.toText(),
        status: false,
        createdAt: ic.time(),
        updatedAt: ic.time(),
      };
      articleStorage.insert(newArticle.id, newArticle);
      return Ok(newArticle);
    } catch (error) {
      // If any error occurs, return it.
      return Err({ InternalError: `${error}` });
    }
  }),
  /**
   * Update article.
   * Returns the updated article.
   * Throws error if article does not exist.
   * Throws error if any other error occurs.
   * The author can infinitely edit the article as long as the editorId is None.
   * The status of the article will be provided by the payload.
   * The updatedAt will be the current time.
   * The editorId will be the caller.
   * The updatedAt will be the current time.
   */
  updateArticle: update([ArticlePayload], Result(Article, Error), (payload) => {
    try {
      if (!articleStorage.containsKey(payload.id)) {
        return Err({ NotFound: "Article not found" });
      }

      const article = articleStorage.get(payload.id);
      let currentStatus = article.Some.status;
      let currentEditor = article.Some.editorId;
      let userInfo = userStorage.get(ic.caller()).Some;
      let currentPrincipal = ic.caller();

      if (userInfo.role == "author") {
        if (currentPrincipal != article.Some.authorId) {
          return Err({ Forbidden: "You can only edit your own article." });
        }
      }

      if (currentEditor !== article.Some.authorId) {
        if (userInfo.role !== "editor") {
          return Err({ Forbidden: "Only editor can edit the articles" });
        }
      }

      if (userInfo.role == "editor") {
        currentStatus = payload.status;
        currentEditor = currentPrincipal.toText();
      }

      articleStorage.insert(article.Some.id, {
        ...article.Some,
        title: payload.title,
        date: payload.date,
        description: payload.description,
        content: payload.content,
        status: currentStatus,
        editorId: currentEditor,
        updatedAt: ic.time(),
      });
      return Ok(article.Some);
    } catch (error) {
      // If any error occurs, return it.
      return Err({ InternalError: `${error}` });
    }
  }),
  /**
   * Get all active articles.
   * Returns all articles.
   * Throws error if any other error occurs.
   */
  getActiveArticles: query([], Result(Vec(Article), Error), () => {
    try {
      // Return all events.
      const events = articleStorage
        .values()
        .filter((article) => article.status);
      return Ok(events);
    } catch (error) {
      // If any error occurs, return it.
      return Err({ InternalError: `${error}` });
    }
  }),
  /**
   * Get all inactive articles.
   * Returns all articles.
   * Only editor can get inactive articles.
   * Throws error if any other error occurs.
   */
  getInactiveArticles: query([], Result(Vec(Article), Error), () => {
    if (userStorage.get(ic.caller()).Some.role !== "editor") {
      return Err({ Forbidden: "Only editor can edit the articles" });
    }

    try {
      // Return all events.
      const events = articleStorage
        .values()
        .filter((article) => !article.status);
      return Ok(events);
    } catch (error) {
      // If any error occurs, return it.
      return Err({ InternalError: `${error}` });
    }
  }),
  /**
   * Get all articles.
   * Returns all articles.
   * Only owner can get all articles.
   * Throws error if any other error occurs.
   */
  getAllArticles: query([], Result(Vec(Article), Error), () => {
    if (!isOwner(ic.caller())) {
      return Err({ Forbidden: "Action reserved for the contract owner" });
    }

    try {
      // Return all events.
      const events = articleStorage.values();
      return Ok(events);
    } catch (error) {
      // If any error occurs, return it.
      return Err({ InternalError: `${error}` });
    }
  }),
  /**
   * Get all categories.
   * Returns all categories.
   * Throws error if any other error occurs.
   */
  getAllCategories: query([], Result(Vec(Category), Error), () => {
    try {
      const categories = categoryStorage.values();
      return Ok(categories);
    } catch (error) {
      // If any error occurs, return it.
      return Err({ InternalError: `${error}` });
    }
  }),
  /**
   * Create a new category.
   * Returns the new category.
   * Throws error if any other error occurs.
   * Only owner can create a new category.
   */
  createCategory: update([text], Result(Category, Error), (categoryName) => {
    if (!isOwner(ic.caller())) {
      return Err({ Forbidden: "Action reserved for the contract owner" });
    }

    try {
      const newCategory = {
        id: uuidv4(),
        name: categoryName,
      };
      categoryStorage.insert(newCategory.id, newCategory);
      return Ok(newCategory);
    } catch (error) {
      // If any error occurs, return it.
      return Err({ InternalError: `${error}` });
    }
  }),
  /**
   * Get active articles by category.
   * Returns all articles.
   * Throws error if any other error occurs.
   */
  getActiveArticlesByCategory: query(
    [text],
    Result(Vec(Article), Error),
    (categoryId) => {
      try {
        const articles = articleStorage
          .values()
          .filter(
            (article) => article.categoryId === categoryId && article.status
          );
        return Ok(articles);
      } catch (error) {
        // If any error occurs, return it.
        return Err({ InternalError: `${error}` });
      }
    }
  ),
  getArticlesOfAuthor: query([], Result(Vec(Article), Error), () => {
    try {
      const articles = articleStorage
        .values()
        .filter((article) => article.authorId == ic.caller().toText());
      return Ok(articles);
    } catch (error) {
      // If any error occurs, return it.
      return Err({ InternalError: `${error}` });
    }
  }),
  getArticlesEditedByEditor: query([], Result(Vec(Article), Error), () => {
    try {
      const articles = articleStorage
        .values()
        .filter((article) => article.editorId == ic.caller().toText());
      return Ok(articles);
    } catch (error) {
      // If any error occurs, return it.
      return Err({ InternalError: `${error}` });
    }
  }),
});

// a workaround to make uuid package work with Azle
globalThis.crypto = {
  // @ts-ignore
  getRandomValues: () => {
    let array = new Uint8Array(32);

    for (let i = 0; i < array.length; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }

    return array;
  },
};
