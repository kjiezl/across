#include <iostream>
#include <string>

using namespace std;

// Function to convert a character to binary
string charToBinary(char c) {
    string binary = "";
    for (int i = 7; i >= 0; --i) {
        binary += ((c >> i) & 1) ? '1' : '0';
    }
    return binary;
}

// Function to convert a string to binary
string stringToBinary(const string &s) {
    string binaryString = "";
    for (char c : s) {
        binaryString += charToBinary(c) + " "; // Adding a space for readability
    }
    return binaryString;
}

int main() {
    string input;
    
    cout << "Enter a string: ";
    getline(cin, input);

    string binary = stringToBinary(input);
    cout << "Binary representation: " << binary << endl;

    return 0;
}