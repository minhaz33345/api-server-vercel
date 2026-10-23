const authServices = require("./LocketAuth");
const postServices = require("./LocketMoment");
const friendServices = require("./LocketFriend");
const processServices = require("./DataProcessing");
const filterServices = require("./LocketFilter");

module.exports = {
  authServices,
  postServices,
  friendServices,
  processServices,
  filterServices,
};
