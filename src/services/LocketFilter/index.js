const { generateFilteredImage } = require("./generateFilteredImage");
const { getFilters } = require("./getFilters");
const { uploadFilterInput } = require("./uploadFilterInput");
const { uploadFilterOutput } = require("./uploadFilterOutput");
const { getFilterCatalog } = require("./getFilterCatalog");

module.exports = {
  generateFilteredImage,
  getFilters,
  uploadFilterInput,
  uploadFilterOutput,
  getFilterCatalog,
};
