#include <iostream>
#include <string>
#include <vector>
#include <algorithm>

// include path: adjust if your json.hpp is in a different relative path
#include "lib/nlohmann/json.hpp"
using json = nlohmann::json;

// simple helper: compute column heights (first occupied row index, 0 = top)
static std::vector<int> compute_heights(const std::vector<int>& field, int cols, int rows) {
  std::vector<int> heights(cols, rows); // default: empty column -> height = rows (free slots)
  for (int x = 0; x < cols; ++x) {
    for (int y = 0; y < rows; ++y) {
      int v = field[y * cols + x];
      if (v != 0) { heights[x] = y; break; }
    }
  }
  return heights;
}

int main() {
  // read stdin completely
  std::string input;
  {
    std::string line;
    while (std::getline(std::cin, line)) {
      input += line;
      input += '\n';
    }
  }

  // fallback fixed response (used if parsing fails or empty)
  auto print_stub = [&]() {
    std::string output = R"({
        "placement": { "x": 2, "r": 0 },
        "inputs": ["LEFT","LEFT","DROP"],
        "eval": 12345
    })";
    std::cout << output << std::endl;
  };

  if (input.empty()) {
    print_stub();
    return 0;
  }

  json req;
  try {
    req = json::parse(input);
  } catch (std::exception& e) {
    // parse error -> return stub for debugging
    print_stub();
    return 0;
  }

  // try to extract field and queue
  std::vector<int> field;
  if (req.contains("self") && req["self"].contains("field") && req["self"]["field"].is_array()) {
    for (auto &v : req["self"]["field"]) {
      try { field.push_back(v.get<int>()); } catch (...) { field.push_back(0); }
    }
  }

  std::vector<std::vector<int>> queue;
  if (req.contains("self") && req["self"].contains("queue") && req["self"]["queue"].is_array()) {
    for (auto &qitem : req["self"]["queue"]) {
      if (qitem.is_array() && qitem.size() >= 2) {
        std::vector<int> pair;
        pair.push_back(qitem[0].get<int>());
        pair.push_back(qitem[1].get<int>());
        queue.push_back(pair);
      }
    }
  }

  // If field is empty or very small, return a simple fallback to avoid crash
  if (field.empty()) {
    // If queue exists, try to output based on queue (put center in middle)
    if (!queue.empty()) {
      json out;
      out["placement"] = { {"x", 2}, {"r", 0} };
      out["inputs"] = json::array({ "LEFT", "DROP" });
      out["eval"] = 0;
      out["pair"] = { queue[0][0], queue[0][1] };
      out["used"] = { {"type", "next"}, {"index", 0} };
      std::cout << out.dump(4) << std::endl;
      return 0;
    }
    print_stub();
    return 0;
  }

  // Infer cols/rows
  int cols = 6;
  int rows = 0;
  std::vector<int> commonCols = {6,7,8,5};
  bool inferred = false;
  for (int c : commonCols) {
    if (field.size() % c == 0) { cols = c; rows = (int)field.size() / c; inferred = true; break; }
  }
  if (!inferred) {
    cols = 6;
    rows = (int)field.size() / cols;
    if (rows <= 0) rows = 13;
  }

  // compute heights and choose target column
  auto heights = compute_heights(field, cols, rows);

  // target: pick column with largest free space (height as large), tie-break toward center
  int bestCol = 0;
  int bestFree = -1;
  int center = cols / 2;
  for (int x = 0; x < cols; ++x) {
    int free = heights[x]; // index of first occupied
    if (free > bestFree) {
      bestFree = free;
      bestCol = x;
    } else if (free == bestFree) {
      if (std::abs(x - center) < std::abs(bestCol - center)) bestCol = x;
    }
  }

  // Heuristic for rotation (prefer horizontal if adjacent column can accept movable)
  int chosenR = 0; // default vertical (r=0)
  // prefer right-horizontal if space available
  if (bestCol + 1 < cols) {
    // prefer horizontal to the right when adjacent column has at least as much free space
    if (heights[bestCol+1] >= heights[bestCol]) {
      chosenR = 1; // horizontal, movable on the right
    }
  }
  // if right is not possible/preferred, try left-horizontal
  if (chosenR == 0 && bestCol - 1 >= 0) {
    if (heights[bestCol-1] >= heights[bestCol]) {
      chosenR = 3; // horizontal, movable on the left
    }
  }
  // fallback: if neither adjacent is available but right exists, use right horizontal to avoid deep vertical stack
  if (chosenR == 0) {
    if (bestCol + 1 < cols) chosenR = 1;
    else if (bestCol - 1 >= 0) chosenR = 3;
    else chosenR = 0;
  }

  // compute simple input sequence to move from startX=2 to bestCol
  int startX = 2; // client's typical spawn column; adjust if needed
  int dx = bestCol - startX;
  std::vector<std::string> inputs;
  while (dx < 0) { inputs.push_back("LEFT"); dx++; }
  while (dx > 0) { inputs.push_back("RIGHT"); dx--; }
  // For horizontal placement we may need extra rotations in some clients; we keep simple drop
  inputs.push_back("DROP");

  // Build output JSON
  json out;
  out["placement"] = { {"x", bestCol}, {"r", chosenR} };
  out["inputs"] = inputs;
  out["eval"] = 0;
  if (!queue.empty()) {
    out["pair"] = { queue[0][0], queue[0][1] };
    out["used"] = { {"type", "next"}, {"index", 0} };
  }

  std::cout << out.dump(4) << std::endl;
  return 0;
}