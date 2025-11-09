#include <iostream>
#include <fstream>
#include <sstream>
#include <string>
#include <chrono>

#include "bloom_filter.hpp"

//can assume in C2 if not in others, have ai determine if not real words included.

enum class levels {
   A1,
   A2,
   B1,
   B2,
   C1,
   C2
};

static std::string levelToString(levels level) {
   switch (level)
   {
   case levels::A1:
      return "A1";
   case levels::A2:
      return "A2";
   case levels::B1:
      return "B1";
   case levels::B2:
      return "B2";
   case levels::C1:
      return "C1";
   case levels::C2:
      return "C2";
   default:
      throw "No level"; //shouldn't occur
   }
}

std::string generate_initializer_string(const std::vector<unsigned char>& data, const std::string& variableName) {
    // Start building the string stream
    std::stringstream ss;

    // Output the declaration prefix
    ss << "std::vector<unsigned char> " << variableName << " = {";

    // Iterate through the vector elements
    for (size_t i = 0; i < data.size(); ++i) {
        // Cast the unsigned char to an int for printing its numeric value
        ss << static_cast<int>(data[i]);

        // Add a comma and a space if it's not the last element
        if (i < data.size() - 1) {
            ss << ", ";
        }
    }

    // Output the closing bracket and semicolon
    ss << "};";

    return ss.str();
}

int main()
{
   auto initializeStart = std::chrono::high_resolution_clock::now();
   std::string files[] = {"A1Words.txt", "A2Words.txt", "B1Words.txt", "B2Words.txt", "C1Words.txt" };
   bloom_parameters A1parameters;
   bloom_parameters A2parameters;
   bloom_parameters B1parameters;
   bloom_parameters B2parameters;
   bloom_parameters C1parameters;
   //bloom_parameters C2parameters;

   A1parameters.projected_element_count = 4400;
   A2parameters.projected_element_count = 6100;
   B1parameters.projected_element_count = 9850;
   B2parameters.projected_element_count = 10000;
   C1parameters.projected_element_count = 4000;
   //C2parameters.projected_element_count = 66000;
   
   A1parameters.false_positive_probability = 0.0001; // 1 in 10000
   A2parameters.false_positive_probability = 0.0001;
   B1parameters.false_positive_probability = 0.0001;
   B2parameters.false_positive_probability = 0.0001;
   C1parameters.false_positive_probability = 0.0001;
   //C2parameters.false_positive_probability = 0.0001;
   
   A1parameters.random_seed = 0xA5A5A5A5;
   A2parameters.random_seed = 0xA5A5A5A5;
   B1parameters.random_seed = 0xA5A5A5A5;
   B2parameters.random_seed = 0xA5A5A5A5;
   C1parameters.random_seed = 0xA5A5A5A5;
   //C2parameters.random_seed = 0xA5A5A5A5;

   A1parameters.compute_optimal_parameters();
   A2parameters.compute_optimal_parameters();
   B1parameters.compute_optimal_parameters();
   B2parameters.compute_optimal_parameters();
   C1parameters.compute_optimal_parameters();
   //C2parameters.compute_optimal_parameters();

   bloom_filter filters[] = {A1parameters, A2parameters, B1parameters, B2parameters, C1parameters };

   //populate filters
   for (std::size_t i = 0; i < (sizeof(files) / sizeof(std::string)); i++) {
      std::ifstream inputFile(files[i]);
      if (inputFile.is_open()) {
         std::string line;
         while (std::getline(inputFile, line)) {
            filters[i].insert(line);
         }
         inputFile.close();
      } else {
        std::cerr << "Unable to open " << files[i] << std::endl;
      }
   }

   //save filters
   for (std::size_t i = 0; i < (sizeof(filters) / sizeof(bloom_filter)); i++) {
      std::vector<unsigned char> table = filters[i].getBitTable();
      std::ofstream outputFile("Table" + files[i]);
      if (outputFile.is_open()) {
         outputFile << generate_initializer_string(table, "A1");
         outputFile.close();
      }
      else {
        std::cerr << "Unable to open " << ("Table" + files[i]) << std::endl;
      }
   }
   
   return 0;
}