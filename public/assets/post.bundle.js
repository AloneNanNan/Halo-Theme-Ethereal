(function (f) {
  if (typeof exports === "object" && typeof module !== "undefined") {
    module.exports = f();
  } else if (typeof define === "function" && define.amd) {
    define([], f);
  } else {
    var g;
    if (typeof window !== "undefined") {
      g = window;
    } else if (typeof global !== "undefined") {
      g = global;
    } else if (typeof self !== "undefined") {
      g = self;
    } else {
      g = this;
    }
    g.QRCode = f();
  }
})(function () {
  var define, module, exports;
  return (function () {
    function r(e, n, t) {
      function o(i, f) {
        if (!n[i]) {
          if (!e[i]) {
            var c = "function" == typeof require && require;
            if (!f && c) return c(i, !0);
            if (u) return u(i, !0);
            var a = new Error("Cannot find module '" + i + "'");
            throw ((a.code = "MODULE_NOT_FOUND"), a);
          }
          var p = (n[i] = { exports: {} });
          e[i][0].call(
            p.exports,
            function (r) {
              var n = e[i][1][r];
              return o(n || r);
            },
            p,
            p.exports,
            r,
            e,
            n,
            t,
          );
        }
        return n[i].exports;
      }
      for (
        var u = "function" == typeof require && require, i = 0;
        i < t.length;
        i++
      )
        o(t[i]);
      return o;
    }
    return r;
  })()(
    {
      1: [
        function (require, module, exports) {
          "use strict";

          /******************************************************************************
           * Created 2008-08-19.
           *
           * Dijkstra path-finding functions. Adapted from the Dijkstar Python project.
           *
           * Copyright (C) 2008
           *   Wyatt Baldwin <self@wyattbaldwin.com>
           *   All rights reserved
           *
           * Licensed under the MIT license.
           *
           *   http://www.opensource.org/licenses/mit-license.php
           *
           * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
           * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
           * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
           * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
           * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
           * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
           * THE SOFTWARE.
           *****************************************************************************/
          var dijkstra = {
            single_source_shortest_paths: function (graph, s, d) {
              // Predecessor map for each node that has been encountered.
              // node ID => predecessor node ID
              var predecessors = {};

              // Costs of shortest paths from s to all nodes encountered.
              // node ID => cost
              var costs = {};
              costs[s] = 0;

              // Costs of shortest paths from s to all nodes encountered; differs from
              // `costs` in that it provides easy access to the node that currently has
              // the known shortest path from s.
              // XXX: Do we actually need both `costs` and `open`?
              var open = dijkstra.PriorityQueue.make();
              open.push(s, 0);

              var closest,
                u,
                v,
                cost_of_s_to_u,
                adjacent_nodes,
                cost_of_e,
                cost_of_s_to_u_plus_cost_of_e,
                cost_of_s_to_v,
                first_visit;
              while (!open.empty()) {
                // In the nodes remaining in graph that have a known cost from s,
                // find the node, u, that currently has the shortest path from s.
                closest = open.pop();
                u = closest.value;
                cost_of_s_to_u = closest.cost;

                // Get nodes adjacent to u...
                adjacent_nodes = graph[u] || {};

                // ...and explore the edges that connect u to those nodes, updating
                // the cost of the shortest paths to any or all of those nodes as
                // necessary. v is the node across the current edge from u.
                for (v in adjacent_nodes) {
                  if (adjacent_nodes.hasOwnProperty(v)) {
                    // Get the cost of the edge running from u to v.
                    cost_of_e = adjacent_nodes[v];

                    // Cost of s to u plus the cost of u to v across e--this is *a*
                    // cost from s to v that may or may not be less than the current
                    // known cost to v.
                    cost_of_s_to_u_plus_cost_of_e = cost_of_s_to_u + cost_of_e;

                    // If we haven't visited v yet OR if the current known cost from s to
                    // v is greater than the new cost we just found (cost of s to u plus
                    // cost of u to v across e), update v's cost in the cost list and
                    // update v's predecessor in the predecessor list (it's now u).
                    cost_of_s_to_v = costs[v];
                    first_visit = typeof costs[v] === "undefined";
                    if (
                      first_visit ||
                      cost_of_s_to_v > cost_of_s_to_u_plus_cost_of_e
                    ) {
                      costs[v] = cost_of_s_to_u_plus_cost_of_e;
                      open.push(v, cost_of_s_to_u_plus_cost_of_e);
                      predecessors[v] = u;
                    }
                  }
                }
              }

              if (typeof d !== "undefined" && typeof costs[d] === "undefined") {
                var msg = [
                  "Could not find a path from ",
                  s,
                  " to ",
                  d,
                  ".",
                ].join("");
                throw new Error(msg);
              }

              return predecessors;
            },

            extract_shortest_path_from_predecessor_list: function (
              predecessors,
              d,
            ) {
              var nodes = [];
              var u = d;
              var predecessor;
              while (u) {
                nodes.push(u);
                predecessor = predecessors[u];
                u = predecessors[u];
              }
              nodes.reverse();
              return nodes;
            },

            find_path: function (graph, s, d) {
              var predecessors = dijkstra.single_source_shortest_paths(
                graph,
                s,
                d,
              );
              return dijkstra.extract_shortest_path_from_predecessor_list(
                predecessors,
                d,
              );
            },

            /**
             * A very naive priority queue implementation.
             */
            PriorityQueue: {
              make: function (opts) {
                var T = dijkstra.PriorityQueue,
                  t = {},
                  key;
                opts = opts || {};
                for (key in T) {
                  if (T.hasOwnProperty(key)) {
                    t[key] = T[key];
                  }
                }
                t.queue = [];
                t.sorter = opts.sorter || T.default_sorter;
                return t;
              },

              default_sorter: function (a, b) {
                return a.cost - b.cost;
              },

              /**
               * Add a new item to the queue and ensure the highest priority element
               * is at the front of the queue.
               */
              push: function (value, cost) {
                var item = { value: value, cost: cost };
                this.queue.push(item);
                this.queue.sort(this.sorter);
              },

              /**
               * Return the highest priority element in the queue.
               */
              pop: function () {
                return this.queue.shift();
              },

              empty: function () {
                return this.queue.length === 0;
              },
            },
          };

          // node.js module exports
          if (typeof module !== "undefined") {
            module.exports = dijkstra;
          }
        },
        {},
      ],
      2: [
        function (require, module, exports) {
          // can-promise has a crash in some versions of react native that dont have
          // standard global objects
          // https://github.com/soldair/node-qrcode/issues/157

          module.exports = function () {
            return (
              typeof Promise === "function" &&
              Promise.prototype &&
              Promise.prototype.then
            );
          };
        },
        {},
      ],
      3: [
        function (require, module, exports) {
          /**
           * Alignment pattern are fixed reference pattern in defined positions
           * in a matrix symbology, which enables the decode software to re-synchronise
           * the coordinate mapping of the image modules in the event of moderate amounts
           * of distortion of the image.
           *
           * Alignment patterns are present only in QR Code symbols of version 2 or larger
           * and their number depends on the symbol version.
           */

          const getSymbolSize = require("./utils").getSymbolSize;

          /**
           * Calculate the row/column coordinates of the center module of each alignment pattern
           * for the specified QR Code version.
           *
           * The alignment patterns are positioned symmetrically on either side of the diagonal
           * running from the top left corner of the symbol to the bottom right corner.
           *
           * Since positions are simmetrical only half of the coordinates are returned.
           * Each item of the array will represent in turn the x and y coordinate.
           * @see {@link getPositions}
           *
           * @param  {Number} version QR Code version
           * @return {Array}          Array of coordinate
           */
          exports.getRowColCoords = function getRowColCoords(version) {
            if (version === 1) return [];

            const posCount = Math.floor(version / 7) + 2;
            const size = getSymbolSize(version);
            const intervals =
              size === 145
                ? 26
                : Math.ceil((size - 13) / (2 * posCount - 2)) * 2;
            const positions = [size - 7]; // Last coord is always (size - 7)

            for (let i = 1; i < posCount - 1; i++) {
              positions[i] = positions[i - 1] - intervals;
            }

            positions.push(6); // First coord is always 6

            return positions.reverse();
          };

          /**
           * Returns an array containing the positions of each alignment pattern.
           * Each array's element represent the center point of the pattern as (x, y) coordinates
           *
           * Coordinates are calculated expanding the row/column coordinates returned by {@link getRowColCoords}
           * and filtering out the items that overlaps with finder pattern
           *
           * @example
           * For a Version 7 symbol {@link getRowColCoords} returns values 6, 22 and 38.
           * The alignment patterns, therefore, are to be centered on (row, column)
           * positions (6,22), (22,6), (22,22), (22,38), (38,22), (38,38).
           * Note that the coordinates (6,6), (6,38), (38,6) are occupied by finder patterns
           * and are not therefore used for alignment patterns.
           *
           * let pos = getPositions(7)
           * // [[6,22], [22,6], [22,22], [22,38], [38,22], [38,38]]
           *
           * @param  {Number} version QR Code version
           * @return {Array}          Array of coordinates
           */
          exports.getPositions = function getPositions(version) {
            const coords = [];
            const pos = exports.getRowColCoords(version);
            const posLength = pos.length;

            for (let i = 0; i < posLength; i++) {
              for (let j = 0; j < posLength; j++) {
                // Skip if position is occupied by finder patterns
                if (
                  (i === 0 && j === 0) || // top-left
                  (i === 0 && j === posLength - 1) || // bottom-left
                  (i === posLength - 1 && j === 0)
                ) {
                  // top-right
                  continue;
                }

                coords.push([pos[i], pos[j]]);
              }
            }

            return coords;
          };
        },
        { "./utils": 22 },
      ],
      4: [
        function (require, module, exports) {
          const Mode = require("./mode");

          /**
           * Array of characters available in alphanumeric mode
           *
           * As per QR Code specification, to each character
           * is assigned a value from 0 to 44 which in this case coincides
           * with the array index
           *
           * @type {Array}
           */
          const ALPHA_NUM_CHARS = [
            "0",
            "1",
            "2",
            "3",
            "4",
            "5",
            "6",
            "7",
            "8",
            "9",
            "A",
            "B",
            "C",
            "D",
            "E",
            "F",
            "G",
            "H",
            "I",
            "J",
            "K",
            "L",
            "M",
            "N",
            "O",
            "P",
            "Q",
            "R",
            "S",
            "T",
            "U",
            "V",
            "W",
            "X",
            "Y",
            "Z",
            " ",
            "$",
            "%",
            "*",
            "+",
            "-",
            ".",
            "/",
            ":",
          ];

          function AlphanumericData(data) {
            this.mode = Mode.ALPHANUMERIC;
            this.data = data;
          }

          AlphanumericData.getBitsLength = function getBitsLength(length) {
            return 11 * Math.floor(length / 2) + 6 * (length % 2);
          };

          AlphanumericData.prototype.getLength = function getLength() {
            return this.data.length;
          };

          AlphanumericData.prototype.getBitsLength = function getBitsLength() {
            return AlphanumericData.getBitsLength(this.data.length);
          };

          AlphanumericData.prototype.write = function write(bitBuffer) {
            let i;

            // Input data characters are divided into groups of two characters
            // and encoded as 11-bit binary codes.
            for (i = 0; i + 2 <= this.data.length; i += 2) {
              // The character value of the first character is multiplied by 45
              let value = ALPHA_NUM_CHARS.indexOf(this.data[i]) * 45;

              // The character value of the second digit is added to the product
              value += ALPHA_NUM_CHARS.indexOf(this.data[i + 1]);

              // The sum is then stored as 11-bit binary number
              bitBuffer.put(value, 11);
            }

            // If the number of input data characters is not a multiple of two,
            // the character value of the final character is encoded as a 6-bit binary number.
            if (this.data.length % 2) {
              bitBuffer.put(ALPHA_NUM_CHARS.indexOf(this.data[i]), 6);
            }
          };

          module.exports = AlphanumericData;
        },
        { "./mode": 15 },
      ],
      5: [
        function (require, module, exports) {
          function BitBuffer() {
            this.buffer = [];
            this.length = 0;
          }

          BitBuffer.prototype = {
            get: function (index) {
              const bufIndex = Math.floor(index / 8);
              return ((this.buffer[bufIndex] >>> (7 - (index % 8))) & 1) === 1;
            },

            put: function (num, length) {
              for (let i = 0; i < length; i++) {
                this.putBit(((num >>> (length - i - 1)) & 1) === 1);
              }
            },

            getLengthInBits: function () {
              return this.length;
            },

            putBit: function (bit) {
              const bufIndex = Math.floor(this.length / 8);
              if (this.buffer.length <= bufIndex) {
                this.buffer.push(0);
              }

              if (bit) {
                this.buffer[bufIndex] |= 0x80 >>> (this.length % 8);
              }

              this.length++;
            },
          };

          module.exports = BitBuffer;
        },
        {},
      ],
      6: [
        function (require, module, exports) {
          /**
           * Helper class to handle QR Code symbol modules
           *
           * @param {Number} size Symbol size
           */
          function BitMatrix(size) {
            if (!size || size < 1) {
              throw new Error(
                "BitMatrix size must be defined and greater than 0",
              );
            }

            this.size = size;
            this.data = new Uint8Array(size * size);
            this.reservedBit = new Uint8Array(size * size);
          }

          /**
           * Set bit value at specified location
           * If reserved flag is set, this bit will be ignored during masking process
           *
           * @param {Number}  row
           * @param {Number}  col
           * @param {Boolean} value
           * @param {Boolean} reserved
           */
          BitMatrix.prototype.set = function (row, col, value, reserved) {
            const index = row * this.size + col;
            this.data[index] = value;
            if (reserved) this.reservedBit[index] = true;
          };

          /**
           * Returns bit value at specified location
           *
           * @param  {Number}  row
           * @param  {Number}  col
           * @return {Boolean}
           */
          BitMatrix.prototype.get = function (row, col) {
            return this.data[row * this.size + col];
          };

          /**
           * Applies xor operator at specified location
           * (used during masking process)
           *
           * @param {Number}  row
           * @param {Number}  col
           * @param {Boolean} value
           */
          BitMatrix.prototype.xor = function (row, col, value) {
            this.data[row * this.size + col] ^= value;
          };

          /**
           * Check if bit at specified location is reserved
           *
           * @param {Number}   row
           * @param {Number}   col
           * @return {Boolean}
           */
          BitMatrix.prototype.isReserved = function (row, col) {
            return this.reservedBit[row * this.size + col];
          };

          module.exports = BitMatrix;
        },
        {},
      ],
      7: [
        function (require, module, exports) {
          const Mode = require("./mode");

          function ByteData(data) {
            this.mode = Mode.BYTE;
            if (typeof data === "string") {
              this.data = new TextEncoder().encode(data);
            } else {
              this.data = new Uint8Array(data);
            }
          }

          ByteData.getBitsLength = function getBitsLength(length) {
            return length * 8;
          };

          ByteData.prototype.getLength = function getLength() {
            return this.data.length;
          };

          ByteData.prototype.getBitsLength = function getBitsLength() {
            return ByteData.getBitsLength(this.data.length);
          };

          ByteData.prototype.write = function (bitBuffer) {
            for (let i = 0, l = this.data.length; i < l; i++) {
              bitBuffer.put(this.data[i], 8);
            }
          };

          module.exports = ByteData;
        },
        { "./mode": 15 },
      ],
      8: [
        function (require, module, exports) {
          const ECLevel = require("./error-correction-level");

          const EC_BLOCKS_TABLE = [
            // L  M  Q  H
            1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 1, 2, 2, 4, 1, 2, 4, 4, 2, 4, 4,
            4, 2, 4, 6, 5, 2, 4, 6, 6, 2, 5, 8, 8, 4, 5, 8, 8, 4, 5, 8, 11, 4,
            8, 10, 11, 4, 9, 12, 16, 4, 9, 16, 16, 6, 10, 12, 18, 6, 10, 17, 16,
            6, 11, 16, 19, 6, 13, 18, 21, 7, 14, 21, 25, 8, 16, 20, 25, 8, 17,
            23, 25, 9, 17, 23, 34, 9, 18, 25, 30, 10, 20, 27, 32, 12, 21, 29,
            35, 12, 23, 34, 37, 12, 25, 34, 40, 13, 26, 35, 42, 14, 28, 38, 45,
            15, 29, 40, 48, 16, 31, 43, 51, 17, 33, 45, 54, 18, 35, 48, 57, 19,
            37, 51, 60, 19, 38, 53, 63, 20, 40, 56, 66, 21, 43, 59, 70, 22, 45,
            62, 74, 24, 47, 65, 77, 25, 49, 68, 81,
          ];

          const EC_CODEWORDS_TABLE = [
            // L  M  Q  H
            7, 10, 13, 17, 10, 16, 22, 28, 15, 26, 36, 44, 20, 36, 52, 64, 26,
            48, 72, 88, 36, 64, 96, 112, 40, 72, 108, 130, 48, 88, 132, 156, 60,
            110, 160, 192, 72, 130, 192, 224, 80, 150, 224, 264, 96, 176, 260,
            308, 104, 198, 288, 352, 120, 216, 320, 384, 132, 240, 360, 432,
            144, 280, 408, 480, 168, 308, 448, 532, 180, 338, 504, 588, 196,
            364, 546, 650, 224, 416, 600, 700, 224, 442, 644, 750, 252, 476,
            690, 816, 270, 504, 750, 900, 300, 560, 810, 960, 312, 588, 870,
            1050, 336, 644, 952, 1110, 360, 700, 1020, 1200, 390, 728, 1050,
            1260, 420, 784, 1140, 1350, 450, 812, 1200, 1440, 480, 868, 1290,
            1530, 510, 924, 1350, 1620, 540, 980, 1440, 1710, 570, 1036, 1530,
            1800, 570, 1064, 1590, 1890, 600, 1120, 1680, 1980, 630, 1204, 1770,
            2100, 660, 1260, 1860, 2220, 720, 1316, 1950, 2310, 750, 1372, 2040,
            2430,
          ];

          /**
           * Returns the number of error correction block that the QR Code should contain
           * for the specified version and error correction level.
           *
           * @param  {Number} version              QR Code version
           * @param  {Number} errorCorrectionLevel Error correction level
           * @return {Number}                      Number of error correction blocks
           */
          exports.getBlocksCount = function getBlocksCount(
            version,
            errorCorrectionLevel,
          ) {
            switch (errorCorrectionLevel) {
              case ECLevel.L:
                return EC_BLOCKS_TABLE[(version - 1) * 4 + 0];
              case ECLevel.M:
                return EC_BLOCKS_TABLE[(version - 1) * 4 + 1];
              case ECLevel.Q:
                return EC_BLOCKS_TABLE[(version - 1) * 4 + 2];
              case ECLevel.H:
                return EC_BLOCKS_TABLE[(version - 1) * 4 + 3];
              default:
                return undefined;
            }
          };

          /**
           * Returns the number of error correction codewords to use for the specified
           * version and error correction level.
           *
           * @param  {Number} version              QR Code version
           * @param  {Number} errorCorrectionLevel Error correction level
           * @return {Number}                      Number of error correction codewords
           */
          exports.getTotalCodewordsCount = function getTotalCodewordsCount(
            version,
            errorCorrectionLevel,
          ) {
            switch (errorCorrectionLevel) {
              case ECLevel.L:
                return EC_CODEWORDS_TABLE[(version - 1) * 4 + 0];
              case ECLevel.M:
                return EC_CODEWORDS_TABLE[(version - 1) * 4 + 1];
              case ECLevel.Q:
                return EC_CODEWORDS_TABLE[(version - 1) * 4 + 2];
              case ECLevel.H:
                return EC_CODEWORDS_TABLE[(version - 1) * 4 + 3];
              default:
                return undefined;
            }
          };
        },
        { "./error-correction-level": 9 },
      ],
      9: [
        function (require, module, exports) {
          exports.L = { bit: 1 };
          exports.M = { bit: 0 };
          exports.Q = { bit: 3 };
          exports.H = { bit: 2 };

          function fromString(string) {
            if (typeof string !== "string") {
              throw new Error("Param is not a string");
            }

            const lcStr = string.toLowerCase();

            switch (lcStr) {
              case "l":
              case "low":
                return exports.L;

              case "m":
              case "medium":
                return exports.M;

              case "q":
              case "quartile":
                return exports.Q;

              case "h":
              case "high":
                return exports.H;

              default:
                throw new Error("Unknown EC Level: " + string);
            }
          }

          exports.isValid = function isValid(level) {
            return (
              level &&
              typeof level.bit !== "undefined" &&
              level.bit >= 0 &&
              level.bit < 4
            );
          };

          exports.from = function from(value, defaultValue) {
            if (exports.isValid(value)) {
              return value;
            }

            try {
              return fromString(value);
            } catch (e) {
              return defaultValue;
            }
          };
        },
        {},
      ],
      10: [
        function (require, module, exports) {
          const getSymbolSize = require("./utils").getSymbolSize;
          const FINDER_PATTERN_SIZE = 7;

          /**
           * Returns an array containing the positions of each finder pattern.
           * Each array's element represent the top-left point of the pattern as (x, y) coordinates
           *
           * @param  {Number} version QR Code version
           * @return {Array}          Array of coordinates
           */
          exports.getPositions = function getPositions(version) {
            const size = getSymbolSize(version);

            return [
              // top-left
              [0, 0],
              // top-right
              [size - FINDER_PATTERN_SIZE, 0],
              // bottom-left
              [0, size - FINDER_PATTERN_SIZE],
            ];
          };
        },
        { "./utils": 22 },
      ],
      11: [
        function (require, module, exports) {
          const Utils = require("./utils");

          const G15 =
            (1 << 10) |
            (1 << 8) |
            (1 << 5) |
            (1 << 4) |
            (1 << 2) |
            (1 << 1) |
            (1 << 0);
          const G15_MASK =
            (1 << 14) | (1 << 12) | (1 << 10) | (1 << 4) | (1 << 1);
          const G15_BCH = Utils.getBCHDigit(G15);

          /**
           * Returns format information with relative error correction bits
           *
           * The format information is a 15-bit sequence containing 5 data bits,
           * with 10 error correction bits calculated using the (15, 5) BCH code.
           *
           * @param  {Number} errorCorrectionLevel Error correction level
           * @param  {Number} mask                 Mask pattern
           * @return {Number}                      Encoded format information bits
           */
          exports.getEncodedBits = function getEncodedBits(
            errorCorrectionLevel,
            mask,
          ) {
            const data = (errorCorrectionLevel.bit << 3) | mask;
            let d = data << 10;

            while (Utils.getBCHDigit(d) - G15_BCH >= 0) {
              d ^= G15 << (Utils.getBCHDigit(d) - G15_BCH);
            }

            // xor final data with mask pattern in order to ensure that
            // no combination of Error Correction Level and data mask pattern
            // will result in an all-zero data string
            return ((data << 10) | d) ^ G15_MASK;
          };
        },
        { "./utils": 22 },
      ],
      12: [
        function (require, module, exports) {
          const EXP_TABLE = new Uint8Array(512);
          const LOG_TABLE = new Uint8Array(256);
          /**
           * Precompute the log and anti-log tables for faster computation later
           *
           * For each possible value in the galois field 2^8, we will pre-compute
           * the logarithm and anti-logarithm (exponential) of this value
           *
           * ref {@link https://en.wikiversity.org/wiki/Reed%E2%80%93Solomon_codes_for_coders#Introduction_to_mathematical_fields}
           */
          (function initTables() {
            let x = 1;
            for (let i = 0; i < 255; i++) {
              EXP_TABLE[i] = x;
              LOG_TABLE[x] = i;

              x <<= 1; // multiply by 2

              // The QR code specification says to use byte-wise modulo 100011101 arithmetic.
              // This means that when a number is 256 or larger, it should be XORed with 0x11D.
              if (x & 0x100) {
                // similar to x >= 256, but a lot faster (because 0x100 == 256)
                x ^= 0x11d;
              }
            }

            // Optimization: double the size of the anti-log table so that we don't need to mod 255 to
            // stay inside the bounds (because we will mainly use this table for the multiplication of
            // two GF numbers, no more).
            // @see {@link mul}
            for (let i = 255; i < 512; i++) {
              EXP_TABLE[i] = EXP_TABLE[i - 255];
            }
          })();

          /**
           * Returns log value of n inside Galois Field
           *
           * @param  {Number} n
           * @return {Number}
           */
          exports.log = function log(n) {
            if (n < 1) throw new Error("log(" + n + ")");
            return LOG_TABLE[n];
          };

          /**
           * Returns anti-log value of n inside Galois Field
           *
           * @param  {Number} n
           * @return {Number}
           */
          exports.exp = function exp(n) {
            return EXP_TABLE[n];
          };

          /**
           * Multiplies two number inside Galois Field
           *
           * @param  {Number} x
           * @param  {Number} y
           * @return {Number}
           */
          exports.mul = function mul(x, y) {
            if (x === 0 || y === 0) return 0;

            // should be EXP_TABLE[(LOG_TABLE[x] + LOG_TABLE[y]) % 255] if EXP_TABLE wasn't oversized
            // @see {@link initTables}
            return EXP_TABLE[LOG_TABLE[x] + LOG_TABLE[y]];
          };
        },
        {},
      ],
      13: [
        function (require, module, exports) {
          const Mode = require("./mode");
          const Utils = require("./utils");

          function KanjiData(data) {
            this.mode = Mode.KANJI;
            this.data = data;
          }

          KanjiData.getBitsLength = function getBitsLength(length) {
            return length * 13;
          };

          KanjiData.prototype.getLength = function getLength() {
            return this.data.length;
          };

          KanjiData.prototype.getBitsLength = function getBitsLength() {
            return KanjiData.getBitsLength(this.data.length);
          };

          KanjiData.prototype.write = function (bitBuffer) {
            let i;

            // In the Shift JIS system, Kanji characters are represented by a two byte combination.
            // These byte values are shifted from the JIS X 0208 values.
            // JIS X 0208 gives details of the shift coded representation.
            for (i = 0; i < this.data.length; i++) {
              let value = Utils.toSJIS(this.data[i]);

              // For characters with Shift JIS values from 0x8140 to 0x9FFC:
              if (value >= 0x8140 && value <= 0x9ffc) {
                // Subtract 0x8140 from Shift JIS value
                value -= 0x8140;

                // For characters with Shift JIS values from 0xE040 to 0xEBBF
              } else if (value >= 0xe040 && value <= 0xebbf) {
                // Subtract 0xC140 from Shift JIS value
                value -= 0xc140;
              } else {
                throw new Error(
                  "Invalid SJIS character: " +
                    this.data[i] +
                    "\n" +
                    "Make sure your charset is UTF-8",
                );
              }

              // Multiply most significant byte of result by 0xC0
              // and add least significant byte to product
              value = ((value >>> 8) & 0xff) * 0xc0 + (value & 0xff);

              // Convert result to a 13-bit binary string
              bitBuffer.put(value, 13);
            }
          };

          module.exports = KanjiData;
        },
        { "./mode": 15, "./utils": 22 },
      ],
      14: [
        function (require, module, exports) {
          /**
           * Data mask pattern reference
           * @type {Object}
           */
          exports.Patterns = {
            PATTERN000: 0,
            PATTERN001: 1,
            PATTERN010: 2,
            PATTERN011: 3,
            PATTERN100: 4,
            PATTERN101: 5,
            PATTERN110: 6,
            PATTERN111: 7,
          };

          /**
           * Weighted penalty scores for the undesirable features
           * @type {Object}
           */
          const PenaltyScores = {
            N1: 3,
            N2: 3,
            N3: 40,
            N4: 10,
          };

          /**
           * Check if mask pattern value is valid
           *
           * @param  {Number}  mask    Mask pattern
           * @return {Boolean}         true if valid, false otherwise
           */
          exports.isValid = function isValid(mask) {
            return (
              mask != null &&
              mask !== "" &&
              !isNaN(mask) &&
              mask >= 0 &&
              mask <= 7
            );
          };

          /**
           * Returns mask pattern from a value.
           * If value is not valid, returns undefined
           *
           * @param  {Number|String} value        Mask pattern value
           * @return {Number}                     Valid mask pattern or undefined
           */
          exports.from = function from(value) {
            return exports.isValid(value) ? parseInt(value, 10) : undefined;
          };

          /**
           * Find adjacent modules in row/column with the same color
           * and assign a penalty value.
           *
           * Points: N1 + i
           * i is the amount by which the number of adjacent modules of the same color exceeds 5
           */
          exports.getPenaltyN1 = function getPenaltyN1(data) {
            const size = data.size;
            let points = 0;
            let sameCountCol = 0;
            let sameCountRow = 0;
            let lastCol = null;
            let lastRow = null;

            for (let row = 0; row < size; row++) {
              sameCountCol = sameCountRow = 0;
              lastCol = lastRow = null;

              for (let col = 0; col < size; col++) {
                let module = data.get(row, col);
                if (module === lastCol) {
                  sameCountCol++;
                } else {
                  if (sameCountCol >= 5)
                    points += PenaltyScores.N1 + (sameCountCol - 5);
                  lastCol = module;
                  sameCountCol = 1;
                }

                module = data.get(col, row);
                if (module === lastRow) {
                  sameCountRow++;
                } else {
                  if (sameCountRow >= 5)
                    points += PenaltyScores.N1 + (sameCountRow - 5);
                  lastRow = module;
                  sameCountRow = 1;
                }
              }

              if (sameCountCol >= 5)
                points += PenaltyScores.N1 + (sameCountCol - 5);
              if (sameCountRow >= 5)
                points += PenaltyScores.N1 + (sameCountRow - 5);
            }

            return points;
          };

          /**
           * Find 2x2 blocks with the same color and assign a penalty value
           *
           * Points: N2 * (m - 1) * (n - 1)
           */
          exports.getPenaltyN2 = function getPenaltyN2(data) {
            const size = data.size;
            let points = 0;

            for (let row = 0; row < size - 1; row++) {
              for (let col = 0; col < size - 1; col++) {
                const last =
                  data.get(row, col) +
                  data.get(row, col + 1) +
                  data.get(row + 1, col) +
                  data.get(row + 1, col + 1);

                if (last === 4 || last === 0) points++;
              }
            }

            return points * PenaltyScores.N2;
          };

          /**
           * Find 1:1:3:1:1 ratio (dark:light:dark:light:dark) pattern in row/column,
           * preceded or followed by light area 4 modules wide
           *
           * Points: N3 * number of pattern found
           */
          exports.getPenaltyN3 = function getPenaltyN3(data) {
            const size = data.size;
            let points = 0;
            let bitsCol = 0;
            let bitsRow = 0;

            for (let row = 0; row < size; row++) {
              bitsCol = bitsRow = 0;
              for (let col = 0; col < size; col++) {
                bitsCol = ((bitsCol << 1) & 0x7ff) | data.get(row, col);
                if (col >= 10 && (bitsCol === 0x5d0 || bitsCol === 0x05d))
                  points++;

                bitsRow = ((bitsRow << 1) & 0x7ff) | data.get(col, row);
                if (col >= 10 && (bitsRow === 0x5d0 || bitsRow === 0x05d))
                  points++;
              }
            }

            return points * PenaltyScores.N3;
          };

          /**
           * Calculate proportion of dark modules in entire symbol
           *
           * Points: N4 * k
           *
           * k is the rating of the deviation of the proportion of dark modules
           * in the symbol from 50% in steps of 5%
           */
          exports.getPenaltyN4 = function getPenaltyN4(data) {
            let darkCount = 0;
            const modulesCount = data.data.length;

            for (let i = 0; i < modulesCount; i++) darkCount += data.data[i];

            const k = Math.abs(
              Math.ceil((darkCount * 100) / modulesCount / 5) - 10,
            );

            return k * PenaltyScores.N4;
          };

          /**
           * Return mask value at given position
           *
           * @param  {Number} maskPattern Pattern reference value
           * @param  {Number} i           Row
           * @param  {Number} j           Column
           * @return {Boolean}            Mask value
           */
          function getMaskAt(maskPattern, i, j) {
            switch (maskPattern) {
              case exports.Patterns.PATTERN000:
                return (i + j) % 2 === 0;
              case exports.Patterns.PATTERN001:
                return i % 2 === 0;
              case exports.Patterns.PATTERN010:
                return j % 3 === 0;
              case exports.Patterns.PATTERN011:
                return (i + j) % 3 === 0;
              case exports.Patterns.PATTERN100:
                return (Math.floor(i / 2) + Math.floor(j / 3)) % 2 === 0;
              case exports.Patterns.PATTERN101:
                return ((i * j) % 2) + ((i * j) % 3) === 0;
              case exports.Patterns.PATTERN110:
                return (((i * j) % 2) + ((i * j) % 3)) % 2 === 0;
              case exports.Patterns.PATTERN111:
                return (((i * j) % 3) + ((i + j) % 2)) % 2 === 0;

              default:
                throw new Error("bad maskPattern:" + maskPattern);
            }
          }

          /**
           * Apply a mask pattern to a BitMatrix
           *
           * @param  {Number}    pattern Pattern reference number
           * @param  {BitMatrix} data    BitMatrix data
           */
          exports.applyMask = function applyMask(pattern, data) {
            const size = data.size;

            for (let col = 0; col < size; col++) {
              for (let row = 0; row < size; row++) {
                if (data.isReserved(row, col)) continue;
                data.xor(row, col, getMaskAt(pattern, row, col));
              }
            }
          };

          /**
           * Returns the best mask pattern for data
           *
           * @param  {BitMatrix} data
           * @return {Number} Mask pattern reference number
           */
          exports.getBestMask = function getBestMask(data, setupFormatFunc) {
            const numPatterns = Object.keys(exports.Patterns).length;
            let bestPattern = 0;
            let lowerPenalty = Infinity;

            for (let p = 0; p < numPatterns; p++) {
              setupFormatFunc(p);
              exports.applyMask(p, data);

              // Calculate penalty
              const penalty =
                exports.getPenaltyN1(data) +
                exports.getPenaltyN2(data) +
                exports.getPenaltyN3(data) +
                exports.getPenaltyN4(data);

              // Undo previously applied mask
              exports.applyMask(p, data);

              if (penalty < lowerPenalty) {
                lowerPenalty = penalty;
                bestPattern = p;
              }
            }

            return bestPattern;
          };
        },
        {},
      ],
      15: [
        function (require, module, exports) {
          const VersionCheck = require("./version-check");
          const Regex = require("./regex");

          /**
           * Numeric mode encodes data from the decimal digit set (0 - 9)
           * (byte values 30HEX to 39HEX).
           * Normally, 3 data characters are represented by 10 bits.
           *
           * @type {Object}
           */
          exports.NUMERIC = {
            id: "Numeric",
            bit: 1 << 0,
            ccBits: [10, 12, 14],
          };

          /**
           * Alphanumeric mode encodes data from a set of 45 characters,
           * i.e. 10 numeric digits (0 - 9),
           *      26 alphabetic characters (A - Z),
           *   and 9 symbols (SP, $, %, *, +, -, ., /, :).
           * Normally, two input characters are represented by 11 bits.
           *
           * @type {Object}
           */
          exports.ALPHANUMERIC = {
            id: "Alphanumeric",
            bit: 1 << 1,
            ccBits: [9, 11, 13],
          };

          /**
           * In byte mode, data is encoded at 8 bits per character.
           *
           * @type {Object}
           */
          exports.BYTE = {
            id: "Byte",
            bit: 1 << 2,
            ccBits: [8, 16, 16],
          };

          /**
           * The Kanji mode efficiently encodes Kanji characters in accordance with
           * the Shift JIS system based on JIS X 0208.
           * The Shift JIS values are shifted from the JIS X 0208 values.
           * JIS X 0208 gives details of the shift coded representation.
           * Each two-byte character value is compacted to a 13-bit binary codeword.
           *
           * @type {Object}
           */
          exports.KANJI = {
            id: "Kanji",
            bit: 1 << 3,
            ccBits: [8, 10, 12],
          };

          /**
           * Mixed mode will contain a sequences of data in a combination of any of
           * the modes described above
           *
           * @type {Object}
           */
          exports.MIXED = {
            bit: -1,
          };

          /**
           * Returns the number of bits needed to store the data length
           * according to QR Code specifications.
           *
           * @param  {Mode}   mode    Data mode
           * @param  {Number} version QR Code version
           * @return {Number}         Number of bits
           */
          exports.getCharCountIndicator = function getCharCountIndicator(
            mode,
            version,
          ) {
            if (!mode.ccBits) throw new Error("Invalid mode: " + mode);

            if (!VersionCheck.isValid(version)) {
              throw new Error("Invalid version: " + version);
            }

            if (version >= 1 && version < 10) return mode.ccBits[0];
            else if (version < 27) return mode.ccBits[1];
            return mode.ccBits[2];
          };

          /**
           * Returns the most efficient mode to store the specified data
           *
           * @param  {String} dataStr Input data string
           * @return {Mode}           Best mode
           */
          exports.getBestModeForData = function getBestModeForData(dataStr) {
            if (Regex.testNumeric(dataStr)) return exports.NUMERIC;
            else if (Regex.testAlphanumeric(dataStr))
              return exports.ALPHANUMERIC;
            else if (Regex.testKanji(dataStr)) return exports.KANJI;
            else return exports.BYTE;
          };

          /**
           * Return mode name as string
           *
           * @param {Mode} mode Mode object
           * @returns {String}  Mode name
           */
          exports.toString = function toString(mode) {
            if (mode && mode.id) return mode.id;
            throw new Error("Invalid mode");
          };

          /**
           * Check if input param is a valid mode object
           *
           * @param   {Mode}    mode Mode object
           * @returns {Boolean} True if valid mode, false otherwise
           */
          exports.isValid = function isValid(mode) {
            return mode && mode.bit && mode.ccBits;
          };

          /**
           * Get mode object from its name
           *
           * @param   {String} string Mode name
           * @returns {Mode}          Mode object
           */
          function fromString(string) {
            if (typeof string !== "string") {
              throw new Error("Param is not a string");
            }

            const lcStr = string.toLowerCase();

            switch (lcStr) {
              case "numeric":
                return exports.NUMERIC;
              case "alphanumeric":
                return exports.ALPHANUMERIC;
              case "kanji":
                return exports.KANJI;
              case "byte":
                return exports.BYTE;
              default:
                throw new Error("Unknown mode: " + string);
            }
          }

          /**
           * Returns mode from a value.
           * If value is not a valid mode, returns defaultValue
           *
           * @param  {Mode|String} value        Encoding mode
           * @param  {Mode}        defaultValue Fallback value
           * @return {Mode}                     Encoding mode
           */
          exports.from = function from(value, defaultValue) {
            if (exports.isValid(value)) {
              return value;
            }

            try {
              return fromString(value);
            } catch (e) {
              return defaultValue;
            }
          };
        },
        { "./regex": 20, "./version-check": 23 },
      ],
      16: [
        function (require, module, exports) {
          const Mode = require("./mode");

          function NumericData(data) {
            this.mode = Mode.NUMERIC;
            this.data = data.toString();
          }

          NumericData.getBitsLength = function getBitsLength(length) {
            return (
              10 * Math.floor(length / 3) +
              (length % 3 ? (length % 3) * 3 + 1 : 0)
            );
          };

          NumericData.prototype.getLength = function getLength() {
            return this.data.length;
          };

          NumericData.prototype.getBitsLength = function getBitsLength() {
            return NumericData.getBitsLength(this.data.length);
          };

          NumericData.prototype.write = function write(bitBuffer) {
            let i, group, value;

            // The input data string is divided into groups of three digits,
            // and each group is converted to its 10-bit binary equivalent.
            for (i = 0; i + 3 <= this.data.length; i += 3) {
              group = this.data.substr(i, 3);
              value = parseInt(group, 10);

              bitBuffer.put(value, 10);
            }

            // If the number of input digits is not an exact multiple of three,
            // the final one or two digits are converted to 4 or 7 bits respectively.
            const remainingNum = this.data.length - i;
            if (remainingNum > 0) {
              group = this.data.substr(i);
              value = parseInt(group, 10);

              bitBuffer.put(value, remainingNum * 3 + 1);
            }
          };

          module.exports = NumericData;
        },
        { "./mode": 15 },
      ],
      17: [
        function (require, module, exports) {
          const GF = require("./galois-field");

          /**
           * Multiplies two polynomials inside Galois Field
           *
           * @param  {Uint8Array} p1 Polynomial
           * @param  {Uint8Array} p2 Polynomial
           * @return {Uint8Array}    Product of p1 and p2
           */
          exports.mul = function mul(p1, p2) {
            const coeff = new Uint8Array(p1.length + p2.length - 1);

            for (let i = 0; i < p1.length; i++) {
              for (let j = 0; j < p2.length; j++) {
                coeff[i + j] ^= GF.mul(p1[i], p2[j]);
              }
            }

            return coeff;
          };

          /**
           * Calculate the remainder of polynomials division
           *
           * @param  {Uint8Array} divident Polynomial
           * @param  {Uint8Array} divisor  Polynomial
           * @return {Uint8Array}          Remainder
           */
          exports.mod = function mod(divident, divisor) {
            let result = new Uint8Array(divident);

            while (result.length - divisor.length >= 0) {
              const coeff = result[0];

              for (let i = 0; i < divisor.length; i++) {
                result[i] ^= GF.mul(divisor[i], coeff);
              }

              // remove all zeros from buffer head
              let offset = 0;
              while (offset < result.length && result[offset] === 0) offset++;
              result = result.slice(offset);
            }

            return result;
          };

          /**
           * Generate an irreducible generator polynomial of specified degree
           * (used by Reed-Solomon encoder)
           *
           * @param  {Number} degree Degree of the generator polynomial
           * @return {Uint8Array}    Buffer containing polynomial coefficients
           */
          exports.generateECPolynomial = function generateECPolynomial(degree) {
            let poly = new Uint8Array([1]);
            for (let i = 0; i < degree; i++) {
              poly = exports.mul(poly, new Uint8Array([1, GF.exp(i)]));
            }

            return poly;
          };
        },
        { "./galois-field": 12 },
      ],
      18: [
        function (require, module, exports) {
          const Utils = require("./utils");
          const ECLevel = require("./error-correction-level");
          const BitBuffer = require("./bit-buffer");
          const BitMatrix = require("./bit-matrix");
          const AlignmentPattern = require("./alignment-pattern");
          const FinderPattern = require("./finder-pattern");
          const MaskPattern = require("./mask-pattern");
          const ECCode = require("./error-correction-code");
          const ReedSolomonEncoder = require("./reed-solomon-encoder");
          const Version = require("./version");
          const FormatInfo = require("./format-info");
          const Mode = require("./mode");
          const Segments = require("./segments");

          /**
 * QRCode for JavaScript
 *
 * modified by Ryan Day for nodejs support
 * Copyright (c) 2011 Ryan Day
 *
 * Licensed under the MIT license:
 *   http://www.opensource.org/licenses/mit-license.php
 *
//---------------------------------------------------------------------
// QRCode for JavaScript
//
// Copyright (c) 2009 Kazuhiko Arase
//
// URL: http://www.d-project.com/
//
// Licensed under the MIT license:
//   http://www.opensource.org/licenses/mit-license.php
//
// The word "QR Code" is registered trademark of
// DENSO WAVE INCORPORATED
//   http://www.denso-wave.com/qrcode/faqpatent-e.html
//
//---------------------------------------------------------------------
*/

          /**
           * Add finder patterns bits to matrix
           *
           * @param  {BitMatrix} matrix  Modules matrix
           * @param  {Number}    version QR Code version
           */
          function setupFinderPattern(matrix, version) {
            const size = matrix.size;
            const pos = FinderPattern.getPositions(version);

            for (let i = 0; i < pos.length; i++) {
              const row = pos[i][0];
              const col = pos[i][1];

              for (let r = -1; r <= 7; r++) {
                if (row + r <= -1 || size <= row + r) continue;

                for (let c = -1; c <= 7; c++) {
                  if (col + c <= -1 || size <= col + c) continue;

                  if (
                    (r >= 0 && r <= 6 && (c === 0 || c === 6)) ||
                    (c >= 0 && c <= 6 && (r === 0 || r === 6)) ||
                    (r >= 2 && r <= 4 && c >= 2 && c <= 4)
                  ) {
                    matrix.set(row + r, col + c, true, true);
                  } else {
                    matrix.set(row + r, col + c, false, true);
                  }
                }
              }
            }
          }

          /**
           * Add timing pattern bits to matrix
           *
           * Note: this function must be called before {@link setupAlignmentPattern}
           *
           * @param  {BitMatrix} matrix Modules matrix
           */
          function setupTimingPattern(matrix) {
            const size = matrix.size;

            for (let r = 8; r < size - 8; r++) {
              const value = r % 2 === 0;
              matrix.set(r, 6, value, true);
              matrix.set(6, r, value, true);
            }
          }

          /**
           * Add alignment patterns bits to matrix
           *
           * Note: this function must be called after {@link setupTimingPattern}
           *
           * @param  {BitMatrix} matrix  Modules matrix
           * @param  {Number}    version QR Code version
           */
          function setupAlignmentPattern(matrix, version) {
            const pos = AlignmentPattern.getPositions(version);

            for (let i = 0; i < pos.length; i++) {
              const row = pos[i][0];
              const col = pos[i][1];

              for (let r = -2; r <= 2; r++) {
                for (let c = -2; c <= 2; c++) {
                  if (
                    r === -2 ||
                    r === 2 ||
                    c === -2 ||
                    c === 2 ||
                    (r === 0 && c === 0)
                  ) {
                    matrix.set(row + r, col + c, true, true);
                  } else {
                    matrix.set(row + r, col + c, false, true);
                  }
                }
              }
            }
          }

          /**
           * Add version info bits to matrix
           *
           * @param  {BitMatrix} matrix  Modules matrix
           * @param  {Number}    version QR Code version
           */
          function setupVersionInfo(matrix, version) {
            const size = matrix.size;
            const bits = Version.getEncodedBits(version);
            let row, col, mod;

            for (let i = 0; i < 18; i++) {
              row = Math.floor(i / 3);
              col = (i % 3) + size - 8 - 3;
              mod = ((bits >> i) & 1) === 1;

              matrix.set(row, col, mod, true);
              matrix.set(col, row, mod, true);
            }
          }

          /**
           * Add format info bits to matrix
           *
           * @param  {BitMatrix} matrix               Modules matrix
           * @param  {ErrorCorrectionLevel}    errorCorrectionLevel Error correction level
           * @param  {Number}    maskPattern          Mask pattern reference value
           */
          function setupFormatInfo(matrix, errorCorrectionLevel, maskPattern) {
            const size = matrix.size;
            const bits = FormatInfo.getEncodedBits(
              errorCorrectionLevel,
              maskPattern,
            );
            let i, mod;

            for (i = 0; i < 15; i++) {
              mod = ((bits >> i) & 1) === 1;

              // vertical
              if (i < 6) {
                matrix.set(i, 8, mod, true);
              } else if (i < 8) {
                matrix.set(i + 1, 8, mod, true);
              } else {
                matrix.set(size - 15 + i, 8, mod, true);
              }

              // horizontal
              if (i < 8) {
                matrix.set(8, size - i - 1, mod, true);
              } else if (i < 9) {
                matrix.set(8, 15 - i - 1 + 1, mod, true);
              } else {
                matrix.set(8, 15 - i - 1, mod, true);
              }
            }

            // fixed module
            matrix.set(size - 8, 8, 1, true);
          }

          /**
           * Add encoded data bits to matrix
           *
           * @param  {BitMatrix}  matrix Modules matrix
           * @param  {Uint8Array} data   Data codewords
           */
          function setupData(matrix, data) {
            const size = matrix.size;
            let inc = -1;
            let row = size - 1;
            let bitIndex = 7;
            let byteIndex = 0;

            for (let col = size - 1; col > 0; col -= 2) {
              if (col === 6) col--;

              while (true) {
                for (let c = 0; c < 2; c++) {
                  if (!matrix.isReserved(row, col - c)) {
                    let dark = false;

                    if (byteIndex < data.length) {
                      dark = ((data[byteIndex] >>> bitIndex) & 1) === 1;
                    }

                    matrix.set(row, col - c, dark);
                    bitIndex--;

                    if (bitIndex === -1) {
                      byteIndex++;
                      bitIndex = 7;
                    }
                  }
                }

                row += inc;

                if (row < 0 || size <= row) {
                  row -= inc;
                  inc = -inc;
                  break;
                }
              }
            }
          }

          /**
           * Create encoded codewords from data input
           *
           * @param  {Number}   version              QR Code version
           * @param  {ErrorCorrectionLevel}   errorCorrectionLevel Error correction level
           * @param  {ByteData} data                 Data input
           * @return {Uint8Array}                    Buffer containing encoded codewords
           */
          function createData(version, errorCorrectionLevel, segments) {
            // Prepare data buffer
            const buffer = new BitBuffer();

            segments.forEach(function (data) {
              // prefix data with mode indicator (4 bits)
              buffer.put(data.mode.bit, 4);

              // Prefix data with character count indicator.
              // The character count indicator is a string of bits that represents the
              // number of characters that are being encoded.
              // The character count indicator must be placed after the mode indicator
              // and must be a certain number of bits long, depending on the QR version
              // and data mode
              // @see {@link Mode.getCharCountIndicator}.
              buffer.put(
                data.getLength(),
                Mode.getCharCountIndicator(data.mode, version),
              );

              // add binary data sequence to buffer
              data.write(buffer);
            });

            // Calculate required number of bits
            const totalCodewords = Utils.getSymbolTotalCodewords(version);
            const ecTotalCodewords = ECCode.getTotalCodewordsCount(
              version,
              errorCorrectionLevel,
            );
            const dataTotalCodewordsBits =
              (totalCodewords - ecTotalCodewords) * 8;

            // Add a terminator.
            // If the bit string is shorter than the total number of required bits,
            // a terminator of up to four 0s must be added to the right side of the string.
            // If the bit string is more than four bits shorter than the required number of bits,
            // add four 0s to the end.
            if (buffer.getLengthInBits() + 4 <= dataTotalCodewordsBits) {
              buffer.put(0, 4);
            }

            // If the bit string is fewer than four bits shorter, add only the number of 0s that
            // are needed to reach the required number of bits.

            // After adding the terminator, if the number of bits in the string is not a multiple of 8,
            // pad the string on the right with 0s to make the string's length a multiple of 8.
            while (buffer.getLengthInBits() % 8 !== 0) {
              buffer.putBit(0);
            }

            // Add pad bytes if the string is still shorter than the total number of required bits.
            // Extend the buffer to fill the data capacity of the symbol corresponding to
            // the Version and Error Correction Level by adding the Pad Codewords 11101100 (0xEC)
            // and 00010001 (0x11) alternately.
            const remainingByte =
              (dataTotalCodewordsBits - buffer.getLengthInBits()) / 8;
            for (let i = 0; i < remainingByte; i++) {
              buffer.put(i % 2 ? 0x11 : 0xec, 8);
            }

            return createCodewords(buffer, version, errorCorrectionLevel);
          }

          /**
           * Encode input data with Reed-Solomon and return codewords with
           * relative error correction bits
           *
           * @param  {BitBuffer} bitBuffer            Data to encode
           * @param  {Number}    version              QR Code version
           * @param  {ErrorCorrectionLevel} errorCorrectionLevel Error correction level
           * @return {Uint8Array}                     Buffer containing encoded codewords
           */
          function createCodewords(bitBuffer, version, errorCorrectionLevel) {
            // Total codewords for this QR code version (Data + Error correction)
            const totalCodewords = Utils.getSymbolTotalCodewords(version);

            // Total number of error correction codewords
            const ecTotalCodewords = ECCode.getTotalCodewordsCount(
              version,
              errorCorrectionLevel,
            );

            // Total number of data codewords
            const dataTotalCodewords = totalCodewords - ecTotalCodewords;

            // Total number of blocks
            const ecTotalBlocks = ECCode.getBlocksCount(
              version,
              errorCorrectionLevel,
            );

            // Calculate how many blocks each group should contain
            const blocksInGroup2 = totalCodewords % ecTotalBlocks;
            const blocksInGroup1 = ecTotalBlocks - blocksInGroup2;

            const totalCodewordsInGroup1 = Math.floor(
              totalCodewords / ecTotalBlocks,
            );

            const dataCodewordsInGroup1 = Math.floor(
              dataTotalCodewords / ecTotalBlocks,
            );
            const dataCodewordsInGroup2 = dataCodewordsInGroup1 + 1;

            // Number of EC codewords is the same for both groups
            const ecCount = totalCodewordsInGroup1 - dataCodewordsInGroup1;

            // Initialize a Reed-Solomon encoder with a generator polynomial of degree ecCount
            const rs = new ReedSolomonEncoder(ecCount);

            let offset = 0;
            const dcData = new Array(ecTotalBlocks);
            const ecData = new Array(ecTotalBlocks);
            let maxDataSize = 0;
            const buffer = new Uint8Array(bitBuffer.buffer);

            // Divide the buffer into the required number of blocks
            for (let b = 0; b < ecTotalBlocks; b++) {
              const dataSize =
                b < blocksInGroup1
                  ? dataCodewordsInGroup1
                  : dataCodewordsInGroup2;

              // extract a block of data from buffer
              dcData[b] = buffer.slice(offset, offset + dataSize);

              // Calculate EC codewords for this data block
              ecData[b] = rs.encode(dcData[b]);

              offset += dataSize;
              maxDataSize = Math.max(maxDataSize, dataSize);
            }

            // Create final data
            // Interleave the data and error correction codewords from each block
            const data = new Uint8Array(totalCodewords);
            let index = 0;
            let i, r;

            // Add data codewords
            for (i = 0; i < maxDataSize; i++) {
              for (r = 0; r < ecTotalBlocks; r++) {
                if (i < dcData[r].length) {
                  data[index++] = dcData[r][i];
                }
              }
            }

            // Apped EC codewords
            for (i = 0; i < ecCount; i++) {
              for (r = 0; r < ecTotalBlocks; r++) {
                data[index++] = ecData[r][i];
              }
            }

            return data;
          }

          /**
           * Build QR Code symbol
           *
           * @param  {String} data                 Input string
           * @param  {Number} version              QR Code version
           * @param  {ErrorCorretionLevel} errorCorrectionLevel Error level
           * @param  {MaskPattern} maskPattern     Mask pattern
           * @return {Object}                      Object containing symbol data
           */
          function createSymbol(
            data,
            version,
            errorCorrectionLevel,
            maskPattern,
          ) {
            let segments;

            if (Array.isArray(data)) {
              segments = Segments.fromArray(data);
            } else if (typeof data === "string") {
              let estimatedVersion = version;

              if (!estimatedVersion) {
                const rawSegments = Segments.rawSplit(data);

                // Estimate best version that can contain raw splitted segments
                estimatedVersion = Version.getBestVersionForData(
                  rawSegments,
                  errorCorrectionLevel,
                );
              }

              // Build optimized segments
              // If estimated version is undefined, try with the highest version
              segments = Segments.fromString(data, estimatedVersion || 40);
            } else {
              throw new Error("Invalid data");
            }

            // Get the min version that can contain data
            const bestVersion = Version.getBestVersionForData(
              segments,
              errorCorrectionLevel,
            );

            // If no version is found, data cannot be stored
            if (!bestVersion) {
              throw new Error(
                "The amount of data is too big to be stored in a QR Code",
              );
            }

            // If not specified, use min version as default
            if (!version) {
              version = bestVersion;

              // Check if the specified version can contain the data
            } else if (version < bestVersion) {
              throw new Error(
                "\n" +
                  "The chosen QR Code version cannot contain this amount of data.\n" +
                  "Minimum version required to store current data is: " +
                  bestVersion +
                  ".\n",
              );
            }

            const dataBits = createData(
              version,
              errorCorrectionLevel,
              segments,
            );

            // Allocate matrix buffer
            const moduleCount = Utils.getSymbolSize(version);
            const modules = new BitMatrix(moduleCount);

            // Add function modules
            setupFinderPattern(modules, version);
            setupTimingPattern(modules);
            setupAlignmentPattern(modules, version);

            // Add temporary dummy bits for format info just to set them as reserved.
            // This is needed to prevent these bits from being masked by {@link MaskPattern.applyMask}
            // since the masking operation must be performed only on the encoding region.
            // These blocks will be replaced with correct values later in code.
            setupFormatInfo(modules, errorCorrectionLevel, 0);

            if (version >= 7) {
              setupVersionInfo(modules, version);
            }

            // Add data codewords
            setupData(modules, dataBits);

            if (isNaN(maskPattern)) {
              // Find best mask pattern
              maskPattern = MaskPattern.getBestMask(
                modules,
                setupFormatInfo.bind(null, modules, errorCorrectionLevel),
              );
            }

            // Apply mask pattern
            MaskPattern.applyMask(maskPattern, modules);

            // Replace format info bits with correct values
            setupFormatInfo(modules, errorCorrectionLevel, maskPattern);

            return {
              modules: modules,
              version: version,
              errorCorrectionLevel: errorCorrectionLevel,
              maskPattern: maskPattern,
              segments: segments,
            };
          }

          /**
           * QR Code
           *
           * @param {String | Array} data                 Input data
           * @param {Object} options                      Optional configurations
           * @param {Number} options.version              QR Code version
           * @param {String} options.errorCorrectionLevel Error correction level
           * @param {Function} options.toSJISFunc         Helper func to convert utf8 to sjis
           */
          exports.create = function create(data, options) {
            if (typeof data === "undefined" || data === "") {
              throw new Error("No input text");
            }

            let errorCorrectionLevel = ECLevel.M;
            let version;
            let mask;

            if (typeof options !== "undefined") {
              // Use higher error correction level as default
              errorCorrectionLevel = ECLevel.from(
                options.errorCorrectionLevel,
                ECLevel.M,
              );
              version = Version.from(options.version);
              mask = MaskPattern.from(options.maskPattern);

              if (options.toSJISFunc) {
                Utils.setToSJISFunction(options.toSJISFunc);
              }
            }

            return createSymbol(data, version, errorCorrectionLevel, mask);
          };
        },
        {
          "./alignment-pattern": 3,
          "./bit-buffer": 5,
          "./bit-matrix": 6,
          "./error-correction-code": 8,
          "./error-correction-level": 9,
          "./finder-pattern": 10,
          "./format-info": 11,
          "./mask-pattern": 14,
          "./mode": 15,
          "./reed-solomon-encoder": 19,
          "./segments": 21,
          "./utils": 22,
          "./version": 24,
        },
      ],
      19: [
        function (require, module, exports) {
          const Polynomial = require("./polynomial");

          function ReedSolomonEncoder(degree) {
            this.genPoly = undefined;
            this.degree = degree;

            if (this.degree) this.initialize(this.degree);
          }

          /**
           * Initialize the encoder.
           * The input param should correspond to the number of error correction codewords.
           *
           * @param  {Number} degree
           */
          ReedSolomonEncoder.prototype.initialize = function initialize(
            degree,
          ) {
            // create an irreducible generator polynomial
            this.degree = degree;
            this.genPoly = Polynomial.generateECPolynomial(this.degree);
          };

          /**
           * Encodes a chunk of data
           *
           * @param  {Uint8Array} data Buffer containing input data
           * @return {Uint8Array}      Buffer containing encoded data
           */
          ReedSolomonEncoder.prototype.encode = function encode(data) {
            if (!this.genPoly) {
              throw new Error("Encoder not initialized");
            }

            // Calculate EC for this data block
            // extends data size to data+genPoly size
            const paddedData = new Uint8Array(data.length + this.degree);
            paddedData.set(data);

            // The error correction codewords are the remainder after dividing the data codewords
            // by a generator polynomial
            const remainder = Polynomial.mod(paddedData, this.genPoly);

            // return EC data blocks (last n byte, where n is the degree of genPoly)
            // If coefficients number in remainder are less than genPoly degree,
            // pad with 0s to the left to reach the needed number of coefficients
            const start = this.degree - remainder.length;
            if (start > 0) {
              const buff = new Uint8Array(this.degree);
              buff.set(remainder, start);

              return buff;
            }

            return remainder;
          };

          module.exports = ReedSolomonEncoder;
        },
        { "./polynomial": 17 },
      ],
      20: [
        function (require, module, exports) {
          const numeric = "[0-9]+";
          const alphanumeric = "[A-Z $%*+\\-./:]+";
          let kanji =
            "(?:[u3000-u303F]|[u3040-u309F]|[u30A0-u30FF]|" +
            "[uFF00-uFFEF]|[u4E00-u9FAF]|[u2605-u2606]|[u2190-u2195]|u203B|" +
            "[u2010u2015u2018u2019u2025u2026u201Cu201Du2225u2260]|" +
            "[u0391-u0451]|[u00A7u00A8u00B1u00B4u00D7u00F7])+";
          kanji = kanji.replace(/u/g, "\\u");

          const byte = "(?:(?![A-Z0-9 $%*+\\-./:]|" + kanji + ")(?:.|[\r\n]))+";

          exports.KANJI = new RegExp(kanji, "g");
          exports.BYTE_KANJI = new RegExp("[^A-Z0-9 $%*+\\-./:]+", "g");
          exports.BYTE = new RegExp(byte, "g");
          exports.NUMERIC = new RegExp(numeric, "g");
          exports.ALPHANUMERIC = new RegExp(alphanumeric, "g");

          const TEST_KANJI = new RegExp("^" + kanji + "$");
          const TEST_NUMERIC = new RegExp("^" + numeric + "$");
          const TEST_ALPHANUMERIC = new RegExp("^[A-Z0-9 $%*+\\-./:]+$");

          exports.testKanji = function testKanji(str) {
            return TEST_KANJI.test(str);
          };

          exports.testNumeric = function testNumeric(str) {
            return TEST_NUMERIC.test(str);
          };

          exports.testAlphanumeric = function testAlphanumeric(str) {
            return TEST_ALPHANUMERIC.test(str);
          };
        },
        {},
      ],
      21: [
        function (require, module, exports) {
          const Mode = require("./mode");
          const NumericData = require("./numeric-data");
          const AlphanumericData = require("./alphanumeric-data");
          const ByteData = require("./byte-data");
          const KanjiData = require("./kanji-data");
          const Regex = require("./regex");
          const Utils = require("./utils");
          const dijkstra = require("dijkstrajs");

          /**
           * Returns UTF8 byte length
           *
           * @param  {String} str Input string
           * @return {Number}     Number of byte
           */
          function getStringByteLength(str) {
            return unescape(encodeURIComponent(str)).length;
          }

          /**
           * Get a list of segments of the specified mode
           * from a string
           *
           * @param  {Mode}   mode Segment mode
           * @param  {String} str  String to process
           * @return {Array}       Array of object with segments data
           */
          function getSegments(regex, mode, str) {
            const segments = [];
            let result;

            while ((result = regex.exec(str)) !== null) {
              segments.push({
                data: result[0],
                index: result.index,
                mode: mode,
                length: result[0].length,
              });
            }

            return segments;
          }

          /**
           * Extracts a series of segments with the appropriate
           * modes from a string
           *
           * @param  {String} dataStr Input string
           * @return {Array}          Array of object with segments data
           */
          function getSegmentsFromString(dataStr) {
            const numSegs = getSegments(Regex.NUMERIC, Mode.NUMERIC, dataStr);
            const alphaNumSegs = getSegments(
              Regex.ALPHANUMERIC,
              Mode.ALPHANUMERIC,
              dataStr,
            );
            let byteSegs;
            let kanjiSegs;

            if (Utils.isKanjiModeEnabled()) {
              byteSegs = getSegments(Regex.BYTE, Mode.BYTE, dataStr);
              kanjiSegs = getSegments(Regex.KANJI, Mode.KANJI, dataStr);
            } else {
              byteSegs = getSegments(Regex.BYTE_KANJI, Mode.BYTE, dataStr);
              kanjiSegs = [];
            }

            const segs = numSegs.concat(alphaNumSegs, byteSegs, kanjiSegs);

            return segs
              .sort(function (s1, s2) {
                return s1.index - s2.index;
              })
              .map(function (obj) {
                return {
                  data: obj.data,
                  mode: obj.mode,
                  length: obj.length,
                };
              });
          }

          /**
           * Returns how many bits are needed to encode a string of
           * specified length with the specified mode
           *
           * @param  {Number} length String length
           * @param  {Mode} mode     Segment mode
           * @return {Number}        Bit length
           */
          function getSegmentBitsLength(length, mode) {
            switch (mode) {
              case Mode.NUMERIC:
                return NumericData.getBitsLength(length);
              case Mode.ALPHANUMERIC:
                return AlphanumericData.getBitsLength(length);
              case Mode.KANJI:
                return KanjiData.getBitsLength(length);
              case Mode.BYTE:
                return ByteData.getBitsLength(length);
            }
          }

          /**
           * Merges adjacent segments which have the same mode
           *
           * @param  {Array} segs Array of object with segments data
           * @return {Array}      Array of object with segments data
           */
          function mergeSegments(segs) {
            return segs.reduce(function (acc, curr) {
              const prevSeg = acc.length - 1 >= 0 ? acc[acc.length - 1] : null;
              if (prevSeg && prevSeg.mode === curr.mode) {
                acc[acc.length - 1].data += curr.data;
                return acc;
              }

              acc.push(curr);
              return acc;
            }, []);
          }

          /**
           * Generates a list of all possible nodes combination which
           * will be used to build a segments graph.
           *
           * Nodes are divided by groups. Each group will contain a list of all the modes
           * in which is possible to encode the given text.
           *
           * For example the text '12345' can be encoded as Numeric, Alphanumeric or Byte.
           * The group for '12345' will contain then 3 objects, one for each
           * possible encoding mode.
           *
           * Each node represents a possible segment.
           *
           * @param  {Array} segs Array of object with segments data
           * @return {Array}      Array of object with segments data
           */
          function buildNodes(segs) {
            const nodes = [];
            for (let i = 0; i < segs.length; i++) {
              const seg = segs[i];

              switch (seg.mode) {
                case Mode.NUMERIC:
                  nodes.push([
                    seg,
                    {
                      data: seg.data,
                      mode: Mode.ALPHANUMERIC,
                      length: seg.length,
                    },
                    { data: seg.data, mode: Mode.BYTE, length: seg.length },
                  ]);
                  break;
                case Mode.ALPHANUMERIC:
                  nodes.push([
                    seg,
                    { data: seg.data, mode: Mode.BYTE, length: seg.length },
                  ]);
                  break;
                case Mode.KANJI:
                  nodes.push([
                    seg,
                    {
                      data: seg.data,
                      mode: Mode.BYTE,
                      length: getStringByteLength(seg.data),
                    },
                  ]);
                  break;
                case Mode.BYTE:
                  nodes.push([
                    {
                      data: seg.data,
                      mode: Mode.BYTE,
                      length: getStringByteLength(seg.data),
                    },
                  ]);
              }
            }

            return nodes;
          }

          /**
           * Builds a graph from a list of nodes.
           * All segments in each node group will be connected with all the segments of
           * the next group and so on.
           *
           * At each connection will be assigned a weight depending on the
           * segment's byte length.
           *
           * @param  {Array} nodes    Array of object with segments data
           * @param  {Number} version QR Code version
           * @return {Object}         Graph of all possible segments
           */
          function buildGraph(nodes, version) {
            const table = {};
            const graph = { start: {} };
            let prevNodeIds = ["start"];

            for (let i = 0; i < nodes.length; i++) {
              const nodeGroup = nodes[i];
              const currentNodeIds = [];

              for (let j = 0; j < nodeGroup.length; j++) {
                const node = nodeGroup[j];
                const key = "" + i + j;

                currentNodeIds.push(key);
                table[key] = { node: node, lastCount: 0 };
                graph[key] = {};

                for (let n = 0; n < prevNodeIds.length; n++) {
                  const prevNodeId = prevNodeIds[n];

                  if (
                    table[prevNodeId] &&
                    table[prevNodeId].node.mode === node.mode
                  ) {
                    graph[prevNodeId][key] =
                      getSegmentBitsLength(
                        table[prevNodeId].lastCount + node.length,
                        node.mode,
                      ) -
                      getSegmentBitsLength(
                        table[prevNodeId].lastCount,
                        node.mode,
                      );

                    table[prevNodeId].lastCount += node.length;
                  } else {
                    if (table[prevNodeId])
                      table[prevNodeId].lastCount = node.length;

                    graph[prevNodeId][key] =
                      getSegmentBitsLength(node.length, node.mode) +
                      4 +
                      Mode.getCharCountIndicator(node.mode, version); // switch cost
                  }
                }
              }

              prevNodeIds = currentNodeIds;
            }

            for (let n = 0; n < prevNodeIds.length; n++) {
              graph[prevNodeIds[n]].end = 0;
            }

            return { map: graph, table: table };
          }

          /**
           * Builds a segment from a specified data and mode.
           * If a mode is not specified, the more suitable will be used.
           *
           * @param  {String} data             Input data
           * @param  {Mode | String} modesHint Data mode
           * @return {Segment}                 Segment
           */
          function buildSingleSegment(data, modesHint) {
            let mode;
            const bestMode = Mode.getBestModeForData(data);

            mode = Mode.from(modesHint, bestMode);

            // Make sure data can be encoded
            if (mode !== Mode.BYTE && mode.bit < bestMode.bit) {
              throw new Error(
                '"' +
                  data +
                  '"' +
                  " cannot be encoded with mode " +
                  Mode.toString(mode) +
                  ".\n Suggested mode is: " +
                  Mode.toString(bestMode),
              );
            }

            // Use Mode.BYTE if Kanji support is disabled
            if (mode === Mode.KANJI && !Utils.isKanjiModeEnabled()) {
              mode = Mode.BYTE;
            }

            switch (mode) {
              case Mode.NUMERIC:
                return new NumericData(data);

              case Mode.ALPHANUMERIC:
                return new AlphanumericData(data);

              case Mode.KANJI:
                return new KanjiData(data);

              case Mode.BYTE:
                return new ByteData(data);
            }
          }

          /**
           * Builds a list of segments from an array.
           * Array can contain Strings or Objects with segment's info.
           *
           * For each item which is a string, will be generated a segment with the given
           * string and the more appropriate encoding mode.
           *
           * For each item which is an object, will be generated a segment with the given
           * data and mode.
           * Objects must contain at least the property "data".
           * If property "mode" is not present, the more suitable mode will be used.
           *
           * @param  {Array} array Array of objects with segments data
           * @return {Array}       Array of Segments
           */
          exports.fromArray = function fromArray(array) {
            return array.reduce(function (acc, seg) {
              if (typeof seg === "string") {
                acc.push(buildSingleSegment(seg, null));
              } else if (seg.data) {
                acc.push(buildSingleSegment(seg.data, seg.mode));
              }

              return acc;
            }, []);
          };

          /**
           * Builds an optimized sequence of segments from a string,
           * which will produce the shortest possible bitstream.
           *
           * @param  {String} data    Input string
           * @param  {Number} version QR Code version
           * @return {Array}          Array of segments
           */
          exports.fromString = function fromString(data, version) {
            const segs = getSegmentsFromString(
              data,
              Utils.isKanjiModeEnabled(),
            );

            const nodes = buildNodes(segs);
            const graph = buildGraph(nodes, version);
            const path = dijkstra.find_path(graph.map, "start", "end");

            const optimizedSegs = [];
            for (let i = 1; i < path.length - 1; i++) {
              optimizedSegs.push(graph.table[path[i]].node);
            }

            return exports.fromArray(mergeSegments(optimizedSegs));
          };

          /**
           * Splits a string in various segments with the modes which
           * best represent their content.
           * The produced segments are far from being optimized.
           * The output of this function is only used to estimate a QR Code version
           * which may contain the data.
           *
           * @param  {string} data Input string
           * @return {Array}       Array of segments
           */
          exports.rawSplit = function rawSplit(data) {
            return exports.fromArray(
              getSegmentsFromString(data, Utils.isKanjiModeEnabled()),
            );
          };
        },
        {
          "./alphanumeric-data": 4,
          "./byte-data": 7,
          "./kanji-data": 13,
          "./mode": 15,
          "./numeric-data": 16,
          "./regex": 20,
          "./utils": 22,
          dijkstrajs: 1,
        },
      ],
      22: [
        function (require, module, exports) {
          let toSJISFunction;
          const CODEWORDS_COUNT = [
            0, // Not used
            26,
            44,
            70,
            100,
            134,
            172,
            196,
            242,
            292,
            346,
            404,
            466,
            532,
            581,
            655,
            733,
            815,
            901,
            991,
            1085,
            1156,
            1258,
            1364,
            1474,
            1588,
            1706,
            1828,
            1921,
            2051,
            2185,
            2323,
            2465,
            2611,
            2761,
            2876,
            3034,
            3196,
            3362,
            3532,
            3706,
          ];

          /**
           * Returns the QR Code size for the specified version
           *
           * @param  {Number} version QR Code version
           * @return {Number}         size of QR code
           */
          exports.getSymbolSize = function getSymbolSize(version) {
            if (!version)
              throw new Error('"version" cannot be null or undefined');
            if (version < 1 || version > 40)
              throw new Error('"version" should be in range from 1 to 40');
            return version * 4 + 17;
          };

          /**
           * Returns the total number of codewords used to store data and EC information.
           *
           * @param  {Number} version QR Code version
           * @return {Number}         Data length in bits
           */
          exports.getSymbolTotalCodewords = function getSymbolTotalCodewords(
            version,
          ) {
            return CODEWORDS_COUNT[version];
          };

          /**
           * Encode data with Bose-Chaudhuri-Hocquenghem
           *
           * @param  {Number} data Value to encode
           * @return {Number}      Encoded value
           */
          exports.getBCHDigit = function (data) {
            let digit = 0;

            while (data !== 0) {
              digit++;
              data >>>= 1;
            }

            return digit;
          };

          exports.setToSJISFunction = function setToSJISFunction(f) {
            if (typeof f !== "function") {
              throw new Error('"toSJISFunc" is not a valid function.');
            }

            toSJISFunction = f;
          };

          exports.isKanjiModeEnabled = function () {
            return typeof toSJISFunction !== "undefined";
          };

          exports.toSJIS = function toSJIS(kanji) {
            return toSJISFunction(kanji);
          };
        },
        {},
      ],
      23: [
        function (require, module, exports) {
          /**
           * Check if QR Code version is valid
           *
           * @param  {Number}  version QR Code version
           * @return {Boolean}         true if valid version, false otherwise
           */
          exports.isValid = function isValid(version) {
            return !isNaN(version) && version >= 1 && version <= 40;
          };
        },
        {},
      ],
      24: [
        function (require, module, exports) {
          const Utils = require("./utils");
          const ECCode = require("./error-correction-code");
          const ECLevel = require("./error-correction-level");
          const Mode = require("./mode");
          const VersionCheck = require("./version-check");

          // Generator polynomial used to encode version information
          const G18 =
            (1 << 12) |
            (1 << 11) |
            (1 << 10) |
            (1 << 9) |
            (1 << 8) |
            (1 << 5) |
            (1 << 2) |
            (1 << 0);
          const G18_BCH = Utils.getBCHDigit(G18);

          function getBestVersionForDataLength(
            mode,
            length,
            errorCorrectionLevel,
          ) {
            for (
              let currentVersion = 1;
              currentVersion <= 40;
              currentVersion++
            ) {
              if (
                length <=
                exports.getCapacity(currentVersion, errorCorrectionLevel, mode)
              ) {
                return currentVersion;
              }
            }

            return undefined;
          }

          function getReservedBitsCount(mode, version) {
            // Character count indicator + mode indicator bits
            return Mode.getCharCountIndicator(mode, version) + 4;
          }

          function getTotalBitsFromDataArray(segments, version) {
            let totalBits = 0;

            segments.forEach(function (data) {
              const reservedBits = getReservedBitsCount(data.mode, version);
              totalBits += reservedBits + data.getBitsLength();
            });

            return totalBits;
          }

          function getBestVersionForMixedData(segments, errorCorrectionLevel) {
            for (
              let currentVersion = 1;
              currentVersion <= 40;
              currentVersion++
            ) {
              const length = getTotalBitsFromDataArray(
                segments,
                currentVersion,
              );
              if (
                length <=
                exports.getCapacity(
                  currentVersion,
                  errorCorrectionLevel,
                  Mode.MIXED,
                )
              ) {
                return currentVersion;
              }
            }

            return undefined;
          }

          /**
           * Returns version number from a value.
           * If value is not a valid version, returns defaultValue
           *
           * @param  {Number|String} value        QR Code version
           * @param  {Number}        defaultValue Fallback value
           * @return {Number}                     QR Code version number
           */
          exports.from = function from(value, defaultValue) {
            if (VersionCheck.isValid(value)) {
              return parseInt(value, 10);
            }

            return defaultValue;
          };

          /**
           * Returns how much data can be stored with the specified QR code version
           * and error correction level
           *
           * @param  {Number} version              QR Code version (1-40)
           * @param  {Number} errorCorrectionLevel Error correction level
           * @param  {Mode}   mode                 Data mode
           * @return {Number}                      Quantity of storable data
           */
          exports.getCapacity = function getCapacity(
            version,
            errorCorrectionLevel,
            mode,
          ) {
            if (!VersionCheck.isValid(version)) {
              throw new Error("Invalid QR Code version");
            }

            // Use Byte mode as default
            if (typeof mode === "undefined") mode = Mode.BYTE;

            // Total codewords for this QR code version (Data + Error correction)
            const totalCodewords = Utils.getSymbolTotalCodewords(version);

            // Total number of error correction codewords
            const ecTotalCodewords = ECCode.getTotalCodewordsCount(
              version,
              errorCorrectionLevel,
            );

            // Total number of data codewords
            const dataTotalCodewordsBits =
              (totalCodewords - ecTotalCodewords) * 8;

            if (mode === Mode.MIXED) return dataTotalCodewordsBits;

            const usableBits =
              dataTotalCodewordsBits - getReservedBitsCount(mode, version);

            // Return max number of storable codewords
            switch (mode) {
              case Mode.NUMERIC:
                return Math.floor((usableBits / 10) * 3);

              case Mode.ALPHANUMERIC:
                return Math.floor((usableBits / 11) * 2);

              case Mode.KANJI:
                return Math.floor(usableBits / 13);

              case Mode.BYTE:
              default:
                return Math.floor(usableBits / 8);
            }
          };

          /**
           * Returns the minimum version needed to contain the amount of data
           *
           * @param  {Segment} data                    Segment of data
           * @param  {Number} [errorCorrectionLevel=H] Error correction level
           * @param  {Mode} mode                       Data mode
           * @return {Number}                          QR Code version
           */
          exports.getBestVersionForData = function getBestVersionForData(
            data,
            errorCorrectionLevel,
          ) {
            let seg;

            const ecl = ECLevel.from(errorCorrectionLevel, ECLevel.M);

            if (Array.isArray(data)) {
              if (data.length > 1) {
                return getBestVersionForMixedData(data, ecl);
              }

              if (data.length === 0) {
                return 1;
              }

              seg = data[0];
            } else {
              seg = data;
            }

            return getBestVersionForDataLength(seg.mode, seg.getLength(), ecl);
          };

          /**
           * Returns version information with relative error correction bits
           *
           * The version information is included in QR Code symbols of version 7 or larger.
           * It consists of an 18-bit sequence containing 6 data bits,
           * with 12 error correction bits calculated using the (18, 6) Golay code.
           *
           * @param  {Number} version QR Code version
           * @return {Number}         Encoded version info bits
           */
          exports.getEncodedBits = function getEncodedBits(version) {
            if (!VersionCheck.isValid(version) || version < 7) {
              throw new Error("Invalid QR Code version");
            }

            let d = version << 12;

            while (Utils.getBCHDigit(d) - G18_BCH >= 0) {
              d ^= G18 << (Utils.getBCHDigit(d) - G18_BCH);
            }

            return (version << 12) | d;
          };
        },
        {
          "./error-correction-code": 8,
          "./error-correction-level": 9,
          "./mode": 15,
          "./utils": 22,
          "./version-check": 23,
        },
      ],
      25: [
        function (require, module, exports) {
          const Utils = require("./utils");

          function clearCanvas(ctx, canvas, size) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            if (!canvas.style) canvas.style = {};
            canvas.height = size;
            canvas.width = size;
            canvas.style.height = size + "px";
            canvas.style.width = size + "px";
          }

          function getCanvasElement() {
            try {
              return document.createElement("canvas");
            } catch (e) {
              throw new Error("You need to specify a canvas element");
            }
          }

          exports.render = function render(qrData, canvas, options) {
            let opts = options;
            let canvasEl = canvas;

            if (
              typeof opts === "undefined" &&
              (!canvas || !canvas.getContext)
            ) {
              opts = canvas;
              canvas = undefined;
            }

            if (!canvas) {
              canvasEl = getCanvasElement();
            }

            opts = Utils.getOptions(opts);
            const size = Utils.getImageWidth(qrData.modules.size, opts);

            const ctx = canvasEl.getContext("2d");
            const image = ctx.createImageData(size, size);
            Utils.qrToImageData(image.data, qrData, opts);

            clearCanvas(ctx, canvasEl, size);
            ctx.putImageData(image, 0, 0);

            return canvasEl;
          };

          exports.renderToDataURL = function renderToDataURL(
            qrData,
            canvas,
            options,
          ) {
            let opts = options;

            if (
              typeof opts === "undefined" &&
              (!canvas || !canvas.getContext)
            ) {
              opts = canvas;
              canvas = undefined;
            }

            if (!opts) opts = {};

            const canvasEl = exports.render(qrData, canvas, opts);

            const type = opts.type || "image/png";
            const rendererOpts = opts.rendererOpts || {};

            return canvasEl.toDataURL(type, rendererOpts.quality);
          };
        },
        { "./utils": 27 },
      ],
      26: [
        function (require, module, exports) {
          const Utils = require("./utils");

          function getColorAttrib(color, attrib) {
            const alpha = color.a / 255;
            const str = attrib + '="' + color.hex + '"';

            return alpha < 1
              ? str +
                  " " +
                  attrib +
                  '-opacity="' +
                  alpha.toFixed(2).slice(1) +
                  '"'
              : str;
          }

          function svgCmd(cmd, x, y) {
            let str = cmd + x;
            if (typeof y !== "undefined") str += " " + y;

            return str;
          }

          function qrToPath(data, size, margin) {
            let path = "";
            let moveBy = 0;
            let newRow = false;
            let lineLength = 0;

            for (let i = 0; i < data.length; i++) {
              const col = Math.floor(i % size);
              const row = Math.floor(i / size);

              if (!col && !newRow) newRow = true;

              if (data[i]) {
                lineLength++;

                if (!(i > 0 && col > 0 && data[i - 1])) {
                  path += newRow
                    ? svgCmd("M", col + margin, 0.5 + row + margin)
                    : svgCmd("m", moveBy, 0);

                  moveBy = 0;
                  newRow = false;
                }

                if (!(col + 1 < size && data[i + 1])) {
                  path += svgCmd("h", lineLength);
                  lineLength = 0;
                }
              } else {
                moveBy++;
              }
            }

            return path;
          }

          exports.render = function render(qrData, options, cb) {
            const opts = Utils.getOptions(options);
            const size = qrData.modules.size;
            const data = qrData.modules.data;
            const qrcodesize = size + opts.margin * 2;

            const bg = !opts.color.light.a
              ? ""
              : "<path " +
                getColorAttrib(opts.color.light, "fill") +
                ' d="M0 0h' +
                qrcodesize +
                "v" +
                qrcodesize +
                'H0z"/>';

            const path =
              "<path " +
              getColorAttrib(opts.color.dark, "stroke") +
              ' d="' +
              qrToPath(data, size, opts.margin) +
              '"/>';

            const viewBox =
              'viewBox="' + "0 0 " + qrcodesize + " " + qrcodesize + '"';

            const width = !opts.width
              ? ""
              : 'width="' + opts.width + '" height="' + opts.width + '" ';

            const svgTag =
              '<svg xmlns="http://www.w3.org/2000/svg" ' +
              width +
              viewBox +
              ' shape-rendering="crispEdges">' +
              bg +
              path +
              "</svg>\n";

            if (typeof cb === "function") {
              cb(null, svgTag);
            }

            return svgTag;
          };
        },
        { "./utils": 27 },
      ],
      27: [
        function (require, module, exports) {
          function hex2rgba(hex) {
            if (typeof hex === "number") {
              hex = hex.toString();
            }

            if (typeof hex !== "string") {
              throw new Error("Color should be defined as hex string");
            }

            let hexCode = hex.slice().replace("#", "").split("");
            if (
              hexCode.length < 3 ||
              hexCode.length === 5 ||
              hexCode.length > 8
            ) {
              throw new Error("Invalid hex color: " + hex);
            }

            // Convert from short to long form (fff -> ffffff)
            if (hexCode.length === 3 || hexCode.length === 4) {
              hexCode = Array.prototype.concat.apply(
                [],
                hexCode.map(function (c) {
                  return [c, c];
                }),
              );
            }

            // Add default alpha value
            if (hexCode.length === 6) hexCode.push("F", "F");

            const hexValue = parseInt(hexCode.join(""), 16);

            return {
              r: (hexValue >> 24) & 255,
              g: (hexValue >> 16) & 255,
              b: (hexValue >> 8) & 255,
              a: hexValue & 255,
              hex: "#" + hexCode.slice(0, 6).join(""),
            };
          }

          exports.getOptions = function getOptions(options) {
            if (!options) options = {};
            if (!options.color) options.color = {};

            const margin =
              typeof options.margin === "undefined" ||
              options.margin === null ||
              options.margin < 0
                ? 4
                : options.margin;

            const width =
              options.width && options.width >= 21 ? options.width : undefined;
            const scale = options.scale || 4;

            return {
              width: width,
              scale: width ? 4 : scale,
              margin: margin,
              color: {
                dark: hex2rgba(options.color.dark || "#000000ff"),
                light: hex2rgba(options.color.light || "#ffffffff"),
              },
              type: options.type,
              rendererOpts: options.rendererOpts || {},
            };
          };

          exports.getScale = function getScale(qrSize, opts) {
            return opts.width && opts.width >= qrSize + opts.margin * 2
              ? opts.width / (qrSize + opts.margin * 2)
              : opts.scale;
          };

          exports.getImageWidth = function getImageWidth(qrSize, opts) {
            const scale = exports.getScale(qrSize, opts);
            return Math.floor((qrSize + opts.margin * 2) * scale);
          };

          exports.qrToImageData = function qrToImageData(imgData, qr, opts) {
            const size = qr.modules.size;
            const data = qr.modules.data;
            const scale = exports.getScale(size, opts);
            const symbolSize = Math.floor((size + opts.margin * 2) * scale);
            const scaledMargin = opts.margin * scale;
            const palette = [opts.color.light, opts.color.dark];

            for (let i = 0; i < symbolSize; i++) {
              for (let j = 0; j < symbolSize; j++) {
                let posDst = (i * symbolSize + j) * 4;
                let pxColor = opts.color.light;

                if (
                  i >= scaledMargin &&
                  j >= scaledMargin &&
                  i < symbolSize - scaledMargin &&
                  j < symbolSize - scaledMargin
                ) {
                  const iSrc = Math.floor((i - scaledMargin) / scale);
                  const jSrc = Math.floor((j - scaledMargin) / scale);
                  pxColor = palette[data[iSrc * size + jSrc] ? 1 : 0];
                }

                imgData[posDst++] = pxColor.r;
                imgData[posDst++] = pxColor.g;
                imgData[posDst++] = pxColor.b;
                imgData[posDst] = pxColor.a;
              }
            }
          };
        },
        {},
      ],
      28: [
        function (require, module, exports) {
          const canPromise = require("./can-promise");

          const QRCode = require("./core/qrcode");
          const CanvasRenderer = require("./renderer/canvas");
          const SvgRenderer = require("./renderer/svg-tag.js");

          function renderCanvas(renderFunc, canvas, text, opts, cb) {
            const args = [].slice.call(arguments, 1);
            const argsNum = args.length;
            const isLastArgCb = typeof args[argsNum - 1] === "function";

            if (!isLastArgCb && !canPromise()) {
              throw new Error("Callback required as last argument");
            }

            if (isLastArgCb) {
              if (argsNum < 2) {
                throw new Error("Too few arguments provided");
              }

              if (argsNum === 2) {
                cb = text;
                text = canvas;
                canvas = opts = undefined;
              } else if (argsNum === 3) {
                if (canvas.getContext && typeof cb === "undefined") {
                  cb = opts;
                  opts = undefined;
                } else {
                  cb = opts;
                  opts = text;
                  text = canvas;
                  canvas = undefined;
                }
              }
            } else {
              if (argsNum < 1) {
                throw new Error("Too few arguments provided");
              }

              if (argsNum === 1) {
                text = canvas;
                canvas = opts = undefined;
              } else if (argsNum === 2 && !canvas.getContext) {
                opts = text;
                text = canvas;
                canvas = undefined;
              }

              return new Promise(function (resolve, reject) {
                try {
                  const data = QRCode.create(text, opts);
                  resolve(renderFunc(data, canvas, opts));
                } catch (e) {
                  reject(e);
                }
              });
            }

            try {
              const data = QRCode.create(text, opts);
              cb(null, renderFunc(data, canvas, opts));
            } catch (e) {
              cb(e);
            }
          }

          exports.create = QRCode.create;
          exports.toCanvas = renderCanvas.bind(null, CanvasRenderer.render);
          exports.toDataURL = renderCanvas.bind(
            null,
            CanvasRenderer.renderToDataURL,
          );

          // only svg for now.
          exports.toString = renderCanvas.bind(null, function (data, _, opts) {
            return SvgRenderer.render(data, opts);
          });
        },
        {
          "./can-promise": 2,
          "./core/qrcode": 18,
          "./renderer/canvas": 25,
          "./renderer/svg-tag.js": 26,
        },
      ],
    },
    {},
    [28],
  )(28);
});
// 文章协议区 URL 同步（支持 Swup 页面切换）
(function () {
  window.__etherealSyncCurrentPostUrl = function () {
    var currentUrl = window.location.href;
    try {
      currentUrl = decodeURIComponent(currentUrl);
    } catch (e) {}
    document
      .querySelectorAll("[data-current-post-url]")
      .forEach(function (link) {
        link.setAttribute("href", currentUrl);
        link.textContent = currentUrl;
      });
  };

  window.__etherealSyncCurrentPostUrl();
  if (!window.__etherealSyncCurrentPostUrlBound) {
    window.__etherealSyncCurrentPostUrlBound = true;
    document.addEventListener("astro:page-load", function () {
      window.__etherealSyncCurrentPostUrl &&
        window.__etherealSyncCurrentPostUrl();
    });
    document.addEventListener("swup:contentReplaced", function () {
      window.__etherealSyncCurrentPostUrl &&
        window.__etherealSyncCurrentPostUrl();
    });
  }
})();
// 文章点赞按钮（Halo API 服务端存储）
(function () {
  var btn = document.getElementById("post-like-btn");
  if (!btn) return;

  // 点赞功能关闭：仅展示空心图标，不显示已赞红心与数字、不可交互
  var disabled = false;
  var cfgEl = document.getElementById("theme-config");
  if (cfgEl && cfgEl.textContent) {
    try {
      var cfg = JSON.parse(cfgEl.textContent);
      disabled = !!(
        cfg &&
        cfg.post &&
        cfg.post.actionBar &&
        cfg.post.actionBar.like === false
      );
    } catch (e) {
      disabled = false;
    }
  }
  if (disabled) {
    var cntEl = document.getElementById("post-like-count");
    if (cntEl) cntEl.style.display = "none";
    return;
  }

  var postName = btn.getAttribute("data-post");
  var svCount = parseInt(btn.getAttribute("data-count") || "0", 10);
  var key = "ethereal-like-" + postName;
  var liked = localStorage.getItem(key) === "1";
  var countEl = document.getElementById("post-like-count");
  var count = Math.max(
    svCount,
    parseInt(localStorage.getItem(key + "-count") || "0", 10) || 0,
  );

  if (liked) btn.classList.add("liked");
  if (countEl) {
    countEl.textContent = count > 0 ? count : "";
    // 新访客也能直接看到已有点赞数（不依赖是否点过赞）
    if (count > 0) countEl.style.display = "flex";
  }

  // 点赞成功冷却 5s（失败可立即重试）：防脚本循环点击刷请求
  var cooldownUntil = 0;

  btn.addEventListener("click", function () {
    if (btn.classList.contains("liked")) return;
    if (Date.now() < cooldownUntil) return;
    // 乐观更新：先本地标记已赞、计数 +1（失败时回滚，与 upvote.js 瞬间版行为对齐）
    btn.classList.add("liked");
    localStorage.setItem(key, "1");
    count++;
    localStorage.setItem(key + "-count", count);
    if (countEl) {
      countEl.textContent = count;
      countEl.style.display = "flex";
    }
    fetch("/apis/api.halo.run/v1alpha1/trackers/upvote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        group: "content.halo.run",
        plural: "posts",
        name: postName,
      }),
    })
      .then(function (res) {
        // fetch 只在网络层失败时 reject，非 2xx 需显式检查（否则会静默失败）
        if (!res.ok) throw new Error("HTTP " + res.status);
        cooldownUntil = Date.now() + 5000;
      })
      .catch(function (e) {
        // 点赞失败：回滚乐观更新（计数 -1、撤销已赞、清除本地标记、抖动提示）
        console.warn("[Like] 点赞失败", e && e.message);
        localStorage.removeItem(key);
        localStorage.removeItem(key + "-count");
        btn.classList.remove("liked");
        count = Math.max(svCount, count - 1);
        if (countEl) {
          countEl.textContent = count > 0 ? count : "";
          if (count <= 0) countEl.style.display = "none";
        }
        btn.classList.add("upvote-failed");
        setTimeout(function () {
          btn.classList.remove("upvote-failed");
        }, 1200);
      });
  });
})();
// 文章分享图生成器 v4 - 修复对齐 + 无封面原版头部
(function () {
  "use strict";

  // ==================== DOM 数据采集 ====================

  function getCurrentUrl() {
    var link = document.querySelector("[data-current-post-url]");
    return link ? link.getAttribute("href") : window.location.href;
  }

  function getPageTitle() {
    var h1 = document.querySelector("#post-container h1");
    return h1 ? h1.textContent.trim() : document.title;
  }

  function getSiteTitle() {
    var el = document.querySelector("#navbar .site-title span:last-child");
    if (el) return el.textContent.trim();
    var t = document.title || "";
    var m = t.split(/\s*[-–—]\s*/);
    return m.length > 1 ? m[m.length - 1].trim() : "Ethereal";
  }

  function getPageDate() {
    var license = document.querySelector(".license-container");
    if (!license) return "";
    var divs = license.querySelectorAll(".line-clamp-2");
    return divs.length > 1 ? divs[1].textContent.trim() : "";
  }

  function getPageAuthor() {
    var license = document.querySelector(".license-container");
    if (!license) return "";
    var divs = license.querySelectorAll(".line-clamp-2");
    return divs.length > 0 ? divs[0].textContent.trim() : "";
  }

  function getPageSummary() {
    var excerpt = document.getElementById("post-excerpt-data");
    return excerpt ? excerpt.getAttribute("data-text") || "" : "";
  }

  function getCoverImageUrl() {
    var img = document.querySelector("#post-cover img");
    return img ? img.getAttribute("src") || "" : "";
  }

  function getAuthorAvatarUrl() {
    var img = document.querySelector(
      '#sidebar .card-base a[aria-label="Profile"] img',
    );
    if (img) return img.getAttribute("src") || "";
    return "";
  }

  function getThemeColor() {
    // 方案1：从页面真实元素读取（元素 color 已经是浏览器渲染好的 sRGB）
    var el = document.querySelector(
      '.site-title, #post-share-btn, .btn-plain, .btn-card, .license-container a, #navbar a[aria-label="Home"]',
    );
    if (el) {
      var color = getComputedStyle(el).color;
      if (color && /^rgba?\(/.test(color)) return color;
    }
    // 方案2：从 --hue 用 Canvas 做 oklch → sRGB 精确转换
    try {
      var hue = "250";
      var s = document.documentElement.style.getPropertyValue("--hue");
      if (s) hue = s;
      else if (document.documentElement.dataset.hue)
        hue = document.documentElement.dataset.hue;
      var c = document.createElement("canvas");
      c.width = 1;
      c.height = 1;
      var ctx = c.getContext("2d");
      ctx.fillStyle = "oklch(0.7 0.14 " + hue + ")";
      ctx.fillRect(0, 0, 1, 1);
      var d = ctx.getImageData(0, 0, 1, 1).data;
      if (d[3] > 0) return "rgb(" + d[0] + "," + d[1] + "," + d[2] + ")";
    } catch (e) {}
    return "rgb(59, 130, 246)";
  }

  function parseRGB(str) {
    if (!str) return { r: 59, g: 130, b: 246 };
    // 标准 rgb/rgba
    var m = str.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (m) return { r: +m[1], g: +m[2], b: +m[3] };
    // oklch → 提取色相映射到简单颜色（近似）
    var o = str.match(/oklch\([\d.]+\)/);
    // 直接失败用默认紫
    return { r: 59, g: 130, b: 246 };
  }

  // ==================== Canvas 工具 ====================

  function wrapText(ctx, text, maxWidth) {
    if (!text) return [];
    var lines = [],
      line = "";
    for (var i = 0; i < text.length; i++) {
      var ch = text.charAt(i);
      if (ch === "\n") {
        lines.push(line);
        line = "";
        continue;
      }
      if (ctx.measureText(line + ch).width > maxWidth && line.length > 0) {
        lines.push(line);
        line = ch;
      } else {
        line += ch;
      }
    }
    if (line) lines.push(line);
    return lines;
  }

  function roundedRect(ctx, x, y, w, h, r) {
    var radius = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + w - radius, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
    ctx.lineTo(x + w, y + h - radius);
    ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
    ctx.lineTo(x + radius, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }

  function darkenColor(rgb, amount) {
    return {
      r: Math.max(0, rgb.r - amount),
      g: Math.max(0, rgb.g - amount),
      b: Math.max(0, rgb.b - amount),
    };
  }

  function loadImageAsync(src, cb) {
    if (!src) {
      cb(null);
      return;
    }
    var img = new Image();
    img.crossOrigin = "anonymous";
    var done = false;
    var timer = setTimeout(function () {
      if (!done) {
        done = true;
        cb(null);
      }
    }, 6000);
    img.onload = function () {
      if (!done) {
        done = true;
        clearTimeout(timer);
        cb(img);
      }
    };
    img.onerror = function () {
      if (!done) {
        done = true;
        clearTimeout(timer);
        cb(null);
      }
    };
    img.src = src;
  }

  // ==================== 按钮状态 ====================

  function setButtonBusy(btn) {
    if (!btn) return;
    btn.disabled = true;
    btn.style.opacity = "0.7";
  }

  function setButtonIdle(btn) {
    if (!btn) return;
    btn.disabled = false;
    btn.style.opacity = "1";
  }

  // ==================== 模态框 ====================

  function createModal(imageDataUrl, title) {
    var existing = document.getElementById("post-share-modal");
    if (existing) existing.remove();

    // 遮罩层
    var backdrop = document.createElement("div");
    backdrop.style.cssText =
      "position:fixed;inset:0;z-index:99998;background:rgba(0,0,0,0.4);backdrop-filter:blur(4px);animation:ps-fade-in 0.25s ease";
    backdrop.addEventListener("click", close);

    // 卡片
    var card = document.createElement("div");
    card.style.cssText =
      "position:fixed;z-index:99999;background:var(--card-bg,#fff);border-radius:var(--radius-large,20px);max-width:440px;width:calc(100% - 32px);box-shadow:0 20px 60px rgba(0,0,0,0.15);animation:ps-slide-up 0.3s ease;padding:0;overflow:hidden;left:50%;top:50%;transform:translate(-50%,-50%);color:var(--deep-text,#333)";

    // 标题：居中标题 + 主题色横线
    var header = document.createElement("div");
    header.style.cssText =
      "display:flex;flex-direction:column;align-items:center;gap:10px;width:100%;padding:24px 24px 0 24px";
    var headerTitle = document.createElement("div");
    headerTitle.className = "text-90";
    headerTitle.style.cssText = "font-size:1.125rem;font-weight:700";
    headerTitle.innerHTML = "<span>分享海报</span>";
    var divider = document.createElement("div");
    divider.className = "h-1 w-5 rounded-full bg-(--primary) transition";
    header.appendChild(headerTitle);
    header.appendChild(divider);

    // 图片区域
    var imgContainer = document.createElement("div");
    imgContainer.style.cssText =
      "padding:16px 24px 0 24px;border-radius:12px;overflow:hidden;display:flex;align-items:center;justify-content:center";
    var img = document.createElement("img");
    img.src = imageDataUrl;
    img.style.cssText =
      "max-width:100%;height:auto;display:block;border-radius:10px";
    img.alt = "分享图预览";
    imgContainer.appendChild(img);

    // ---- 按钮行 ----
    var btnRow = document.createElement("div");
    btnRow.style.cssText = "display:flex;gap:10px;padding:16px 24px 24px 24px";

    // 图标 hover 放大（与打赏按钮同款）
    function zoomIcon(btn, on) {
      var svg = btn.querySelector("svg");
      if (!svg) return;
      svg.style.transition = "transform 0.25s ease";
      svg.style.transform = on ? "scale(1.1)" : "";
    }

    // 复制链接按钮（次要按钮，参考 .ext-btn-back 样式）
    var copyBtn = document.createElement("button");
    copyBtn.style.cssText =
      "flex:1;display:inline-flex;align-items:center;justify-content:center;gap:6px;padding:12px 16px;border:none;border-radius:0.75rem;font-size:0.8125rem;font-weight:500;cursor:pointer;background:var(--btn-regular-bg,oklch(0.95 0.025 250));color:var(--btn-content,oklch(0.55 0.12 250));user-select:none;transition:background 0.2s";
    copyBtn.onmouseenter = function () {
      copyBtn.style.background =
        "var(--btn-regular-bg-hover,oklch(0.9 0.05 250))";
      zoomIcon(copyBtn, true);
    };
    copyBtn.onmouseleave = function () {
      copyBtn.style.background = "var(--btn-regular-bg,oklch(0.95 0.025 250))";
      zoomIcon(copyBtn, false);
    };
    // 链接图标
    copyBtn.innerHTML =
      '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg><span>复制链接</span>';

    // 保存图片按钮（主要按钮，参考 .ext-btn-go 样式）
    var saveBtn = document.createElement("button");
    saveBtn.style.cssText =
      "flex:1;display:inline-flex;align-items:center;justify-content:center;gap:6px;padding:12px 16px;border:none;border-radius:0.75rem;font-size:0.8125rem;font-weight:500;cursor:pointer;color:#fff;background:var(--primary,oklch(0.7 0.14 250));user-select:none;transition:filter 0.2s";
    saveBtn.onmouseenter = function () {
      saveBtn.style.filter = "brightness(1.1)";
      zoomIcon(saveBtn, true);
    };
    saveBtn.onmouseleave = function () {
      saveBtn.style.filter = "";
      zoomIcon(saveBtn, false);
    };
    // 下载图标
    saveBtn.innerHTML =
      '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg><span>保存图片</span>';

    btnRow.appendChild(copyBtn);
    btnRow.appendChild(saveBtn);

    // 关闭按钮（右上角，无阴影；hover 图标旋转 90° + 变主题色）
    var closeBtn = document.createElement("button");
    closeBtn.style.cssText =
      "position:absolute;top:12px;right:12px;width:28px;height:28px;display:flex;align-items:center;justify-content:center;border:none;border-radius:0.5rem;background:transparent;color:var(--text-50,#999);cursor:pointer;transition:transform 0.25s ease,color 0.25s ease,background 0.25s ease;z-index:2";
    closeBtn.setAttribute("aria-label", "关闭");
    closeBtn.innerHTML =
      '<span class="icon-[material-symbols--close-rounded] text-xl leading-none"></span>';
    closeBtn.onmouseenter = function () {
      closeBtn.style.transform = "rotate(90deg)";
      closeBtn.style.color = "var(--primary)";
      closeBtn.style.background = "var(--btn-regular-bg,rgba(0,0,0,0.06))";
    };
    closeBtn.onmouseleave = function () {
      closeBtn.style.transform = "";
      closeBtn.style.color = "var(--text-50,#999)";
      closeBtn.style.background = "transparent";
    };
    card.appendChild(closeBtn);
    card.appendChild(header);

    card.appendChild(imgContainer);
    card.appendChild(btnRow);

    // 插入 DOM
    document.body.appendChild(backdrop);
    document.body.appendChild(card);

    // ---- 动画 keyframes ----
    var style = document.getElementById("ps-keyframes");
    if (!style) {
      style = document.createElement("style");
      style.id = "ps-keyframes";
      style.textContent =
        "@keyframes ps-fade-in{from{opacity:0}to{opacity:1}}" +
        "@keyframes ps-slide-up{from{opacity:0;transform:translate(-50%,calc(-50% + 16px)) scale(0.97)}to{opacity:1;transform:translate(-50%,-50%) scale(1)}}";
      document.head.appendChild(style);
    }

    // ---- 关闭函数 ----
    function close() {
      backdrop.style.transition = "opacity 0.15s ease";
      backdrop.style.opacity = "0";
      card.style.transition = "opacity 0.15s ease, transform 0.15s ease";
      card.style.opacity = "0";
      card.style.transform = "translate(-50%,calc(-50% + 8px)) scale(0.98)";
      setTimeout(function () {
        if (backdrop.parentNode) backdrop.parentNode.removeChild(backdrop);
        if (card.parentNode) card.parentNode.removeChild(card);
      }, 150);
    }

    // ---- 事件 ----
    saveBtn.addEventListener("click", function () {
      try {
        var safeTitle =
          (title || "post")
            .replace(/[\\/:*?"<>|\s]+/g, "-")
            .slice(0, 40)
            .replace(/-+$/, "") || "post";
        var link = document.createElement("a");
        link.download = safeTitle + "-share.png";
        link.href = imageDataUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } catch (e) {
        console.error("保存失败:", e);
      }
    });

    copyBtn.addEventListener("click", function () {
      try {
        var url = getCurrentUrl();
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(url).then(function () {
            copyBtn.innerHTML =
              '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg><span>已复制!</span>';
            setTimeout(function () {
              copyBtn.innerHTML =
                '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg><span>复制链接</span>';
            }, 2000);
          });
        } else {
          var ta = document.createElement("textarea");
          ta.value = url;
          ta.style.cssText = "position:fixed;opacity:0";
          document.body.appendChild(ta);
          ta.select();
          document.execCommand("copy");
          document.body.removeChild(ta);
          copyBtn.innerHTML =
            '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg><span>已复制!</span>';
          setTimeout(function () {
            copyBtn.innerHTML =
              '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg><span>复制链接</span>';
          }, 2000);
        }
      } catch (e) {
        console.error("复制失败:", e);
      }
    });

    // ESC 关闭
    var escHandler = function (e) {
      if (e.key === "Escape") {
        close();
        document.removeEventListener("keydown", escHandler);
      }
    };
    document.addEventListener("keydown", escHandler);
    // 关闭按钮
    closeBtn.addEventListener("click", close);
  }

  // ==================== 海报渲染 ====================

  var W = 800,
    H = 1000;
  var MARGIN = 32,
    RADIUS = 24;
  var PAD = 40;

  // 海报最高限制：与原固定版本（1000）一致，超出部分摘要用省略号截断
  var POSTER_MAX_H = 1000;
  // Footer 预留高度：分割线间隙(8) + rowTop(22) + QR(110) + 水印下方余量
  var POSTER_FOOTER_RESERVE = 200;

  // 换行 + 限行，超出部分末行加省略号
  function wrapTextLimited(ctx, text, maxWidth, maxLines) {
    var lines = wrapText(ctx, text, maxWidth);
    if (lines.length <= maxLines) return lines;
    var out = lines.slice(0, maxLines);
    var last = out[maxLines - 1];
    while (ctx.measureText(last + "...").width > maxWidth && last.length)
      last = last.slice(0, -1);
    out[maxLines - 1] = last + "...";
    return out;
  }

  // 摘要起始 Y → 摘要可用行数（保证 contentEnd ≤ MAX_H - FOOTER_RESERVE）
  function summaryMaxLines(startY) {
    var limit = POSTER_MAX_H - POSTER_FOOTER_RESERVE;
    return Math.max(1, Math.floor((limit - startY - 16) / 36));
  }

  // 根据标题/摘要行数动态计算海报高度，避免固定高度导致摘要下方大面积留白
  // 注意：wrapText 依赖 ctx.font 测量宽度，必须与绘制阶段（drawPoster）的字体一致，
  // 否则行数算少会导致 footer 超出画布被裁剪
  function calcPosterHeight(ctx, data) {
    var hasCover = !!(data.coverImg && data.coverImg.naturalWidth > 0);
    var iw = W - MARGIN * 2 - PAD * 2;
    var baseFont = "-apple-system,'PingFang SC','Noto Sans SC',sans-serif";
    var contentEnd;
    if (hasCover) {
      // 封面 360 + 标题覆于封面 + 摘要（摘要绘制字体 400 24px，行距 36）
      ctx.font = "400 24px " + baseFont;
      var summaryY = MARGIN + 360 + 28;
      var sumLines = wrapTextLimited(
        ctx,
        data.summary,
        iw - 24,
        summaryMaxLines(summaryY),
      );
      contentEnd = summaryY + sumLines.length * 36 + 16;
    } else {
      // 顶部装饰/站点名/日期 + 分割线 + 标题 + 摘要
      ctx.font = "700 48px " + baseFont;
      var dividerY = MARGIN + 88;
      var titleLines = wrapText(ctx, data.title, iw);
      if (titleLines.length > 2) titleLines = titleLines.slice(0, 2);
      var titleY = dividerY + 36;
      ctx.font = "400 24px " + baseFont;
      var summaryY2 = titleY + titleLines.length * 58 + 20;
      var sumLines2 = wrapTextLimited(
        ctx,
        data.summary,
        iw - 24,
        summaryMaxLines(summaryY2),
      );
      contentEnd = summaryY2 + sumLines2.length * 36 + 16;
    }
    return Math.max(
      Math.min(contentEnd + POSTER_FOOTER_RESERVE, POSTER_MAX_H),
      560,
    );
  }

  function drawPoster(ctx, data) {
    var p = data.primaryRGB;
    var col = {
      primary: "rgb(" + p.r + "," + p.g + "," + p.b + ")",
      primaryLight: "rgba(" + p.r + "," + p.g + "," + p.b + ",0.2)",
      primaryMid: "rgba(" + p.r + "," + p.g + "," + p.b + ",0.08)",
    };
    var hasCover = !!(data.coverImg && data.coverImg.naturalWidth > 0);
    var posterH = ctx.canvas.height;
    var cx = MARGIN,
      cy = MARGIN,
      cw = W - MARGIN * 2,
      ch = posterH - MARGIN * 2;
    var ix = cx + PAD,
      iw = cw - PAD * 2;

    // 背景
    ctx.fillStyle = "#f4f5f7";
    ctx.fillRect(0, 0, W, posterH);
    ctx.fillStyle = "#ffffff";
    roundedRect(ctx, cx, cy, cw, ch, RADIUS);
    ctx.fill();

    // ---- 装饰性主题色圆形（交错布局，增加层次感） ----
    ctx.save();
    ctx.globalAlpha = 0.1;
    ctx.fillStyle = col.primary;
    // 右上大圆
    ctx.beginPath();
    ctx.arc(cx + cw - 30, cy - 10, 140, 0, Math.PI * 2);
    ctx.fill();
    // 左下中圆
    ctx.beginPath();
    ctx.arc(cx - 20, cy + ch + 10, 110, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.06;
    // 中间穿插小圆
    ctx.beginPath();
    ctx.arc(cx + cw - 160, cy + 300, 60, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx + 140, cy + ch - 120, 40, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // ↓↓↓ 两条布局路径：有封面 / 无封面 ↓↓↓

    if (hasCover) {
      // ======== 有封面：封面图 + 标题覆在图上 ========
      drawCover(ctx, cx, cy, cw, data.coverImg);
      drawTitleOnCover(ctx, cx, cy, cw, 360, data.title);

      // 摘要（封面下方）
      var summaryY = cy + 360 + 28;
      drawSummary(ctx, data.summary, ix, iw, summaryY, col);

      // Footer
      var sumLines = wrapTextLimited(
        ctx,
        data.summary,
        iw - 24,
        summaryMaxLines(summaryY),
      );
      var contentEnd = summaryY + sumLines.length * 36 + 16;
      drawFooter(ctx, data, cx, cy, cw, ch, ix, iw, PAD, col, contentEnd);
    } else {
      // ======== 无封面：原版顶部风格 ========
      // 装饰竖条
      ctx.fillStyle = col.primary;
      roundedRect(ctx, ix, cy + 44, 4, 20, 2);
      ctx.fill();

      // 站点名（左上）
      ctx.textBaseline = "top";
      ctx.fillStyle = col.primary;
      ctx.font =
        "600 17px -apple-system,'PingFang SC','Noto Sans SC',sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(data.siteName, ix + 16, cy + 44);

      // 日期（右上）
      ctx.fillStyle = "#9ca3af";
      ctx.font =
        "400 15px -apple-system,'PingFang SC','Noto Sans SC',sans-serif";
      ctx.textAlign = "right";
      ctx.fillText(data.date || "", cx + cw - PAD, cy + 46);

      // 分割线
      var dividerY = cy + 88;
      ctx.strokeStyle = "#e5e7eb";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(ix, dividerY);
      ctx.lineTo(cx + cw - PAD, dividerY);
      ctx.stroke();

      // 标题（左对齐大字体）
      ctx.textBaseline = "top";
      ctx.textAlign = "left";
      ctx.fillStyle = "#111827";
      ctx.font =
        "700 48px -apple-system,'PingFang SC','Noto Sans SC',sans-serif";
      var titleLines = wrapText(ctx, data.title, iw);
      if (titleLines.length > 2) {
        titleLines = titleLines.slice(0, 2);
        var last = titleLines[1];
        while (ctx.measureText(last + "...").width > iw && last.length)
          last = last.slice(0, -1);
        titleLines[1] = last + "...";
      }
      var titleY = dividerY + 36;
      for (var ti = 0; ti < titleLines.length; ti++) {
        ctx.fillText(titleLines[ti], ix, titleY + ti * 58);
      }

      // 摘要
      var summaryY2 = titleY + titleLines.length * 58 + 20;
      drawSummary(ctx, data.summary, ix, iw, summaryY2, col);

      // Footer
      var sumLines2 = wrapTextLimited(
        ctx,
        data.summary,
        iw - 24,
        summaryMaxLines(summaryY2),
      );
      var contentEnd2 = summaryY2 + sumLines2.length * 36 + 16;
      drawFooter(ctx, data, cx, cy, cw, ch, ix, iw, PAD, col, contentEnd2);
    }
  }

  // ---------- 子绘制函数 ----------

  // 摘要（左竖线装饰）
  function drawSummary(ctx, summary, ix, iw, startY, col) {
    if (!summary) return;
    ctx.textBaseline = "top";
    ctx.textAlign = "left";
    ctx.font = "400 24px -apple-system,'PingFang SC','Noto Sans SC',sans-serif";
    // 限行与 calcPosterHeight 一致：摘要过长省略号截断，海报高度不超过 1000
    var lines = wrapTextLimited(ctx, summary, iw - 24, summaryMaxLines(startY));
    if (lines.length === 0) return;
    var lineH = 36;
    var textH = lines.length * lineH;

    // 竖线：6px 上下外延
    ctx.fillStyle = col.primaryMid;
    roundedRect(ctx, ix, startY - 6, 4, textH + 12, 2);
    ctx.fill();

    // 正文：竖线右侧 16px
    ctx.fillStyle = "#4b5563";
    for (var si = 0; si < lines.length; si++) {
      ctx.fillText(lines[si], ix + 16, startY + si * lineH);
    }
  }

  // Footer（头像 + 昵称/日期 + QR）
  function drawFooter(ctx, data, cx, cy, cw, ch, ix, iw, PAD, col, contentEnd) {
    var dividerY = contentEnd + 8;

    // 分割线
    ctx.strokeStyle = "#f0f0f0";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(ix, dividerY);
    ctx.lineTo(cx + cw - PAD, dividerY);
    ctx.stroke();

    // ---- 整体行高由较高的一侧决定，左右居中 ----
    var avatarSize = 72;
    var qrSize = 110;
    var rowH = qrSize; // QR 较高，以它为准
    var rowTop = dividerY + 22;

    // ---- 右侧：二维码（基准） ----
    var qrX = cx + cw - PAD - qrSize;
    var qrY = rowTop; // QR 顶对齐行

    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.06)";
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 2;
    ctx.fillStyle = "#ffffff";
    roundedRect(ctx, qrX, qrY, qrSize, qrSize, 8);
    ctx.fill();
    ctx.restore();

    if (data.qrImg && data.qrImg.naturalWidth > 0) {
      ctx.drawImage(data.qrImg, qrX + 5, qrY + 5, qrSize - 10, qrSize - 10);
    } else {
      ctx.fillStyle = col.primaryLight;
      roundedRect(ctx, qrX + 6, qrY + 6, qrSize - 12, qrSize - 12, 6);
      ctx.fill();
      ctx.fillStyle = col.primary;
      ctx.font = "600 13px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("QR", qrX + qrSize / 2, qrY + qrSize / 2 - 6);
      ctx.font = "400 10px sans-serif";
      ctx.fillText("扫码", qrX + qrSize / 2, qrY + qrSize / 2 + 12);
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
    }
    // 二维码下方不显示网址

    // ---- 左侧：头像 + 昵称/日期（整体基于 QR 居中） ----
    // 头像在行内垂直居中（相对 QR）
    var avatarY = rowTop + (rowH - avatarSize) / 2;
    var avatarX = ix;

    if (data.avatarImg && data.avatarImg.naturalWidth > 0) {
      ctx.save();
      roundedRect(ctx, avatarX, avatarY, avatarSize, avatarSize, 10);
      ctx.clip();
      ctx.drawImage(data.avatarImg, avatarX, avatarY, avatarSize, avatarSize);
      ctx.restore();
    } else {
      ctx.fillStyle = col.primaryLight;
      roundedRect(ctx, avatarX, avatarY, avatarSize, avatarSize, 10);
      ctx.fill();
      ctx.fillStyle = col.primary;
      ctx.font =
        "bold 24px -apple-system,'PingFang SC','Noto Sans SC',sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(
        (data.author && data.author.charAt(0)) || "?",
        avatarX + avatarSize / 2,
        avatarY + avatarSize / 2,
      );
      ctx.textBaseline = "top";
      ctx.textAlign = "left";
    }

    // 昵称+日期基于头像垂直居中
    var nickFontSize = 26;
    var dateFontSize = 18;
    var textGap = 6;
    var textBlockH = nickFontSize + textGap + dateFontSize;
    var avatarCenterY = avatarY + avatarSize / 2;
    var textStartY = avatarCenterY - textBlockH / 2;

    var textX = avatarX + avatarSize + 18;
    ctx.textBaseline = "top";
    ctx.textAlign = "left";
    ctx.fillStyle = "#1f2937";
    ctx.font =
      "700 " +
      nickFontSize +
      "px -apple-system,'PingFang SC','Noto Sans SC',sans-serif";
    ctx.fillText(data.author || "", textX, textStartY);

    ctx.fillStyle = "#9ca3af";
    ctx.font =
      "400 " +
      dateFontSize +
      "px -apple-system,'PingFang SC','Noto Sans SC',sans-serif";
    ctx.fillText(data.date || "", textX, textStartY + nickFontSize + textGap);

    // ---- 水印 ----
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    ctx.fillStyle = "#d1d5db";
    ctx.font = "400 12px sans-serif";
    ctx.fillText("Made with " + data.siteName, W / 2, cy + ch - 16);
  }

  // 封面图（object-fit: cover）
  function drawCover(ctx, cx, cy, cw, coverImg) {
    var sw = coverImg.naturalWidth,
      sh = coverImg.naturalHeight;
    var scale = Math.max(cw / sw, 360 / sh);
    var dx = cx + (cw - sw * scale) / 2;
    var dy = cy + (360 - sh * scale) / 2;
    ctx.save();
    roundedRect(ctx, cx, cy, cw, 360, RADIUS);
    ctx.clip();
    ctx.drawImage(coverImg, dx, dy, sw * scale, sh * scale);
    ctx.restore();
  }

  // 封面上的标题（带暗色渐变，左下角）
  function drawTitleOnCover(ctx, cx, cy, cw, coverH, title) {
    var gradH = 110;
    var grad = ctx.createLinearGradient(
      cx,
      cy + coverH - gradH,
      cx,
      cy + coverH,
    );
    grad.addColorStop(0, "rgba(0,0,0,0)");
    grad.addColorStop(0.5, "rgba(0,0,0,0.4)");
    grad.addColorStop(1, "rgba(0,0,0,0.65)");
    ctx.fillStyle = grad;
    ctx.fillRect(cx, cy + coverH - gradH, cw, gradH);

    ctx.textBaseline = "bottom";
    ctx.textAlign = "left";
    ctx.fillStyle = "#ffffff";
    ctx.font = "700 44px -apple-system,'PingFang SC','Noto Sans SC',sans-serif";
    ctx.shadowColor = "rgba(0,0,0,0.4)";
    ctx.shadowBlur = 6;

    var maxW = cw - 60;
    var lines = wrapText(ctx, title, maxW);
    if (lines.length > 2) {
      lines = lines.slice(0, 2);
      var last = lines[1];
      while (ctx.measureText(last + "...").width > maxW && last.length)
        last = last.slice(0, -1);
      lines[1] = last + "...";
    }
    var lineH = 54;
    var baseY = cy + coverH - 22;
    for (var i = lines.length - 1; i >= 0; i--) {
      ctx.fillText(lines[i], cx + 30, baseY - (lines.length - 1 - i) * lineH);
    }
    ctx.shadowBlur = 0;
    ctx.shadowColor = "transparent";
  }

  // ==================== 主流程 ====================

  function generateShareImage() {
    var btn = document.getElementById("post-share-btn");
    if (!btn || btn.disabled) return;

    setButtonBusy(btn);

    try {
      var posterData = {
        url: getCurrentUrl(),
        title: getPageTitle(),
        siteName: getSiteTitle(),
        date: getPageDate(),
        author: getPageAuthor(),
        summary: getPageSummary(),
        primaryRGB: parseRGB(getThemeColor()),
        coverImg: null,
        avatarImg: null,
        qrImg: null,
      };
      var coverUrl = getCoverImageUrl();
      var avatarUrl = getAuthorAvatarUrl();

      var hasQR =
        typeof QRCode !== "undefined" && typeof QRCode.toDataURL === "function";
      var pending = 0;
      if (hasQR) pending++;
      if (coverUrl) pending++;
      if (avatarUrl) pending++;

      function render() {
        try {
          var canvas = document.createElement("canvas");
          canvas.width = W;
          var ctx = canvas.getContext("2d");
          canvas.height = calcPosterHeight(ctx, posterData);
          drawPoster(ctx, posterData);
          createModal(canvas.toDataURL("image/png"), posterData.title);
        } catch (e) {
          console.error("share: render error:", e);
        }
        setButtonIdle(btn);
      }

      function taskDone() {
        pending--;
        if (pending <= 0) render();
      }

      if (hasQR) {
        QRCode.toDataURL(
          posterData.url,
          {
            width: 140,
            margin: 1,
            color: { dark: "#111827", light: "#ffffff" },
          },
          function (err, qrDataUrl) {
            if (err || !qrDataUrl) {
              taskDone();
              return;
            }
            loadImageAsync(qrDataUrl, function (img) {
              posterData.qrImg = img;
              taskDone();
            });
          },
        );
      }
      if (coverUrl) {
        loadImageAsync(coverUrl, function (img) {
          posterData.coverImg = img;
          taskDone();
        });
      }
      if (avatarUrl) {
        loadImageAsync(avatarUrl, function (img) {
          posterData.avatarImg = img;
          taskDone();
        });
      }

      if (pending === 0) render();
    } catch (e) {
      console.error("share: error:", e);
      setButtonIdle(btn);
    }
  }

  // ==================== 初始化 ====================

  function safeInit() {
    var btn = document.getElementById("post-share-btn");
    if (btn) {
      btn.removeEventListener("click", generateShareImage);
      btn.addEventListener("click", generateShareImage);
    } else {
      setTimeout(safeInit, 500);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", safeInit);
  } else {
    safeInit();
  }

  document.addEventListener("swup:contentReplaced", safeInit);
})();
// 复制功能
(function () {
  function init() {
    var buttons = document.querySelectorAll(".copy-btn");
    buttons.forEach(function (btn) {
      if (btn.dataset.copyBound) return;
      btn.dataset.copyBound = "true";

      btn.addEventListener("click", function () {
        var text = btn.getAttribute("data-copy-text");
        if (!text) {
          var container = btn.closest(".flex");
          if (container) {
            var link = container.querySelector("a");
            if (link) {
              text = link.href || link.textContent;
            }
          }
        }

        if (text) {
          text = text.trim();
          var textSpan = btn.querySelector("span:last-child");
          var iconSpan = btn.querySelector(
            ".icon-\\[material-symbols--content-copy-outline-rounded\\]",
          );
          var originalText = textSpan ? textSpan.textContent : "";
          var originalClasses = iconSpan ? iconSpan.className : "";

          if (textSpan) textSpan.textContent = "已复制";
          if (iconSpan)
            iconSpan.className =
              "icon-[material-symbols--check-rounded] text-sm";
          btn.disabled = true;
          btn.classList.add("text-(--primary)");

          navigator.clipboard
            .writeText(text)
            .then(function () {
              setTimeout(function () {
                if (textSpan) textSpan.textContent = originalText;
                if (iconSpan) iconSpan.className = originalClasses;
                btn.disabled = false;
                btn.classList.remove("text-(--primary)");
              }, 2000);
            })
            .catch(function () {
              console.warn("[Copy] Clipboard write failed");
              setTimeout(function () {
                if (textSpan) textSpan.textContent = originalText;
                if (iconSpan) iconSpan.className = originalClasses;
                btn.disabled = false;
                btn.classList.remove("text-(--primary)");
              }, 2000);
            });
        }
      });
    });
  }

  // 初始化
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  // Swup 页面切换后重新初始化
  document.addEventListener("swup:contentReplaced", function () {
    document.querySelectorAll("[data-copy-bound]").forEach(function (el) {
      el.dataset.copyBound = "";
    });
    init();
  });
})();
// 文章打赏模态框（微信/支付宝收款二维码）
(function () {
  "use strict";

  var RETRY_LIMIT = 10;

  function getActionBarConfig() {
    var el = document.getElementById("theme-config");
    if (!el || !el.textContent) return null;
    try {
      var config = JSON.parse(el.textContent);
      return (config && config.post && config.post.actionBar) || null;
    } catch (e) {
      return null;
    }
  }

  function openRewardModal() {
    var actionBar = getActionBarConfig();
    var rs = (actionBar && actionBar.rewardSetting) || {};
    var title = (
      rs.title || "如果这篇文章对你有帮助，可以请我喝杯咖啡！"
    ).trim();
    var wechat = (rs.wechat_qr || "").trim();
    var alipay = (rs.alipay_qr || "").trim();

    if (!wechat && !alipay) {
      alert("博主暂未配置收款二维码");
      return;
    }

    // 复用分享模态框的动画 keyframes（ps-fade-in / ps-slide-up）
    var style = document.getElementById("ps-keyframes");
    if (!style) {
      style = document.createElement("style");
      style.id = "ps-keyframes";
      style.textContent =
        "@keyframes ps-fade-in{from{opacity:0}to{opacity:1}}" +
        "@keyframes ps-slide-up{from{opacity:0;transform:translate(-50%,calc(-50% + 16px)) scale(0.97)}to{opacity:1;transform:translate(-50%,-50%) scale(1)}}";
      document.head.appendChild(style);
    }

    // 遮罩层
    var backdrop = document.createElement("div");
    backdrop.style.cssText =
      "position:fixed;inset:0;z-index:99998;background:rgba(0,0,0,0.4);backdrop-filter:blur(4px);animation:ps-fade-in 0.25s ease";

    // 卡片
    var card = document.createElement("div");
    card.style.cssText =
      "position:fixed;z-index:99999;background:var(--card-bg,#fff);border-radius:var(--radius-large,20px);max-width:420px;width:calc(100% - 32px);box-shadow:0 20px 60px rgba(0,0,0,0.15);animation:ps-slide-up 0.3s ease;left:50%;top:50%;transform:translate(-50%,-50%);color:var(--deep-text,#333);overflow:hidden";

    // 内容区
    var body = document.createElement("div");
    body.style.cssText =
      "padding:24px 28px 28px 28px;display:flex;flex-direction:column;align-items:center;gap:14px";

    // 标题：图标 + 标题（纯色，不用主题色）+ 分隔线（参考 Profile 昵称下方 h-1 w-5 横线）
    var header = document.createElement("div");
    header.style.cssText =
      "display:flex;flex-direction:column;align-items:center;gap:10px;width:100%";
    var headerTitle = document.createElement("div");
    headerTitle.className = "text-90";
    headerTitle.style.cssText = "font-size:1.125rem;font-weight:700";
    headerTitle.innerHTML = "<span>打赏支持</span>";
    var divider = document.createElement("div");
    divider.className = "h-1 w-5 rounded-full bg-(--primary) transition";
    header.appendChild(headerTitle);
    header.appendChild(divider);

    // 自定义文案
    var desc = document.createElement("p");
    desc.style.cssText =
      "margin:0;font-size:0.875rem;line-height:1.7;color:var(--text-75,#666);text-align:center;white-space:pre-line;word-break:break-word";
    desc.textContent = title;

    // 二维码行（微信 + 支付宝，1:1 正方形）
    var qrRow = document.createElement("div");
    qrRow.style.cssText =
      "display:flex;justify-content:center;gap:14px;width:100%";

    function buildQrItem(label, iconCls, src) {
      var item = document.createElement("div");
      item.className = "card-hover-lift";
      item.style.cssText =
        "flex:1;max-width:148px;display:flex;flex-direction:column;align-items:center;gap:10px;background:#fff;border:1px solid color-mix(in oklab,var(--primary) 18%,transparent);border-radius:14px;padding:12px 12px 10px 12px;transition:transform 0.25s ease,box-shadow 0.25s ease";
      // hover 效果接入项目 card-hover-lift（依赖 body.card-hover-lift-enabled）：
      // translateY(-4px) + 主题色阴影
      var img = document.createElement("img");
      img.src = src;
      img.alt = label;
      img.style.cssText =
        "width:100%;aspect-ratio:1/1;object-fit:contain;border-radius:8px;background:#fff";
      var labelEl = document.createElement("div");
      labelEl.style.cssText =
        "display:flex;align-items:center;gap:5px;font-size:0.8125rem;font-weight:600;color:var(--text-75,#555)";
      labelEl.innerHTML =
        '<span class="' +
        iconCls +
        ' text-[1rem] text-(--primary)"></span><span>' +
        label +
        "</span>";
      item.appendChild(img);
      item.appendChild(labelEl);
      return item;
    }

    if (wechat) {
      qrRow.appendChild(
        buildQrItem("微信", "icon-[fa6-brands--weixin]", wechat),
      );
    }
    if (alipay) {
      qrRow.appendChild(
        buildQrItem("支付宝", "icon-[fa6-brands--alipay]", alipay),
      );
    }

    // 关闭按钮（右上角，无阴影；hover 图标旋转 90° + 变主题色）
    var closeBtn = document.createElement("button");
    closeBtn.style.cssText =
      "position:absolute;top:12px;right:12px;width:28px;height:28px;display:flex;align-items:center;justify-content:center;border:none;border-radius:0.5rem;background:transparent;color:var(--text-50,#999);cursor:pointer;transition:transform 0.25s ease,color 0.25s ease,background 0.25s ease;z-index:2";
    closeBtn.setAttribute("aria-label", "关闭");
    closeBtn.innerHTML =
      '<span class="icon-[material-symbols--close-rounded] text-xl leading-none"></span>';
    closeBtn.onmouseenter = function () {
      closeBtn.style.transform = "rotate(90deg)";
      closeBtn.style.color = "var(--primary)";
      closeBtn.style.background = "var(--btn-regular-bg,rgba(0,0,0,0.06))";
    };
    closeBtn.onmouseleave = function () {
      closeBtn.style.transform = "";
      closeBtn.style.color = "var(--text-50,#999)";
      closeBtn.style.background = "transparent";
    };

    body.appendChild(header);
    if (title) body.appendChild(desc);
    body.appendChild(qrRow);
    card.appendChild(closeBtn);
    card.appendChild(body);

    document.body.appendChild(backdrop);
    document.body.appendChild(card);

    function close() {
      backdrop.style.transition = "opacity 0.15s ease";
      backdrop.style.opacity = "0";
      card.style.transition = "opacity 0.15s ease, transform 0.15s ease";
      card.style.opacity = "0";
      card.style.transform = "translate(-50%,calc(-50% + 8px)) scale(0.98)";
      setTimeout(function () {
        if (backdrop.parentNode) backdrop.parentNode.removeChild(backdrop);
        if (card.parentNode) card.parentNode.removeChild(card);
      }, 150);
    }

    backdrop.addEventListener("click", close);
    closeBtn.addEventListener("click", close);
    var escHandler = function (e) {
      if (e.key === "Escape") {
        close();
        document.removeEventListener("keydown", escHandler);
      }
    };
    document.addEventListener("keydown", escHandler);
  }

  function bindButton() {
    var btn = document.getElementById("post-reward-btn");
    if (!btn || btn.dataset.rewardBound) return false;
    btn.dataset.rewardBound = "true";
    btn.addEventListener("click", openRewardModal);
    return true;
  }

  // 重试定时器全局唯一，避免 Swup 多次触发叠加
  var retryTimer = null;
  var retryCount = 0;

  function clearRetry() {
    if (retryTimer) {
      clearInterval(retryTimer);
      retryTimer = null;
    }
  }

  function safeInit() {
    if (bindButton()) {
      clearRetry();
      return;
    }
    // 按钮可能因 Swup 渲染时机延迟出现，有限重试后放弃
    // （后台关闭打赏时按钮不存在，避免无限轮询）
    if (!retryTimer) {
      retryCount = 0;
      retryTimer = setInterval(function () {
        if (bindButton() || ++retryCount >= RETRY_LIMIT) {
          clearRetry();
        }
      }, 300);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", safeInit);
  } else {
    safeInit();
  }

  // Swup 页面切换后重新绑定（新按钮 DOM）
  document.addEventListener("swup:contentReplaced", safeInit);
})();
