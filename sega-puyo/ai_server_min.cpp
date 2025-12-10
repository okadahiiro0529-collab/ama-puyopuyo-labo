#include <iostream>
#include <string>
#include <vector>
#include "lib/nlohmann/json.hpp"
using json = nlohmann::json;

int main() {
  std::string line, input;
  while (std::getline(std::cin, line)) {
    input += line;
    input += '\n';
  }

  json req;
  try {
    req = json::parse(input);
  } catch (...) {
    std::cout << R"({"placement":{"x":2,"r":0},"inputs":["LEFT","DROP"],"eval":12345})" << std::endl;
    return 0;
  }

  std::vector<int> field;
  if (req.contains("self") && req["self"].contains("field")) {
    for (auto &v : req["self"]["field"]) { field.push_back(v.get<int>()); }
  }

  int cols = 6;
  int rows = (field.empty() ? 13 : (int)field.size() / cols);
  std::vector<int> heights(cols, rows);
  for (int x=0;x<cols;x++){
    for (int y=0;y<rows;y++){
      if (!field.empty() && field[y*cols + x] != 0) { heights[x] = y; break; }
    }
  }

  int best = 2; int bestFree = -1;
  int center = cols/2;
  for (int x=0;x<cols;x++){
    int free = heights[x];
    if (free > bestFree) { bestFree = free; best = x; }
    else if (free == bestFree && std::abs(x-center) < std::abs(best-center)) best = x;
  }

  // create move list
  std::vector<std::string> inps;
  int dx = best - 2;
  while (dx < 0) { inps.push_back("LEFT"); dx++; }
  while (dx > 0) { inps.push_back("RIGHT"); dx--; }
  inps.push_back("DROP");

  json out;
  out["placement"] = { {"x", best}, {"r", 0} };
  out["inputs"] = inps;
  out["eval"] = 0;
  std::cout << out.dump() << std::endl;
  return 0;
}