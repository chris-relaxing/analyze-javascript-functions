
print("Analyze JavaScript Functions")

#  Notes:
# ---------------------------------------------------
# Function definition patterns
# 1. Name + optional space + = + optional space + function + optional space + (
# goto_task = function(
# formatDateTime = function (

# 1. function + space + name + optional space + (
# function placeHeader(

# To do:
# Need to distinguish between helper functions, regular functions, event handlers, and anonymous functions

# ---------------------------------------------------

# Path to JavaScript file to parse
# jsFile = r"C:\Users\Chris Nielsen\Desktop\odyssey\client\resources\resource_edit.js"
# jsFile = r"C:\Users\Chris Nielsen\Desktop\python\analyze-javascript-functions\test_files\active_tasks.js"
jsFile = r"C:\Users\Chris Nielsen\Desktop\python\analyze-javascript-functions\test_files\usertask.js"

# Global tokens
space = " "
function = "function"
leftParen = "("
rightParen = ")"
equalSign = '='

# Container for all function declaration information (names, args, lines)
functionDeclarations = []

# This dicionary for checking for duplicate function names (keys)
functionNames = {}
duplicateFunctionNames = {}

ex1 = 'const formatDateTime = function (isoDate){'

line = ex1.split()
# print("line:", line)

# ---------------------------------------------------
def getFunctionName(line):
    """Parse the line to return the function name"""
    # The original line has already been split blank spaces. line passed in is a list.
    # print(line.index(function))
    functionName = ""

    # The index in the list where the word 'function' was found
    functionIndex = line.index(function)

    #  Pattern: formatDateTime = function ()
    if line[functionIndex-1] == equalSign:
        functionName = line[functionIndex-2]
        print('functionName:', functionName)

    #  Pattern: formatDateTime: function()
    elif line[functionIndex-1][-1] == ':':
        functionName = line[functionIndex-1][:-1]
        print('functionName:', functionName)

    else:
        #  Pattern: function formatDateTime()
        functionName = line[functionIndex+1]
        print('functionName:', functionName)
        # Not needed. The line has already been split on leftParen so we will never see it here.
        # if functionName.endswith(leftParen):
        #     functionName = functionName[:-1]
        #     print('2functionName:', functionName)

    return functionName

# ---------------------------------------------------

def getFunctionArgs(line):
    """Parse the element  to return the function arguments"""
    lparen = line.split('(')
    rightSide = lparen[1]    #right side of the line contains the function args
    rparen = rightSide.split(')')
    functionArgs = rparen[0]

    if functionArgs:
        print("Function args:", functionArgs)
        return functionArgs


# ---------------------------------------------------
def findFunctions(line, lineNumber):
    parsedLine = line.rstrip().split()
    # if (function in parsedLine):

    #  Look for opening and closing parenthesis
    if (leftParen and rightParen in line):

        lparen = line.split('(')
        leftSide = lparen[0]     #look for key word 'function' on left side of the line
        leftSide = leftSide.split()
        if (function in leftSide):
            print("\n")
            print('Line:', lineNumber, line.rstrip())


            rightSide = lparen[1]    #right side of the line contains the function args
            rparen = rightSide.split(')')
            args = rparen[0]

            functionName = getFunctionName(leftSide)
            functionArgs = getFunctionArgs(line)
            funcDetails = {
                'name'  : functionName,
                'args'  : functionArgs,
                'line'  : line
            }
            functionDeclarations.append(funcDetails)

            # Add the functionName to the functionNames dictionary to check for duplicates
            if functionName not in functionNames.keys():
                # First time we are seeing this function name, so add it to the dictionary
                functionNames[functionName] = lineNumber
            else:
                # We have seen this function name before
                print(functionName, "is a duplicate!")
                if functionName not in duplicateFunctionNames.keys():
                    # First time we are seeing this duplicate function name, so add it to the dictionary
                    duplicateLocations = []
                    firstInstance = functionNames[functionName]
                    duplicateLocations.append(firstInstance)
                    duplicateLocations.append(lineNumber)
                    duplicateFunctionNames[functionName] = duplicateLocations
                else:
                    # This function name is already in the duplicates dictionary, so add the new line location to the list
                    duplicateFunctionNames[functionName].append(lineNumber)




# ---------------------------------------------------

def main():
    # Reading of the JavaScript file - work on after perfecting pattern detection
    print("Reading file:", jsFile)

    with open(jsFile, 'r') as js:
      x = js.readlines()

    # print('type', type(x))
    # print('length', len(x))
    fileLength = len(x)

    i = 0
    for line in x:
      if(i < fileLength):
          # parsedLine = line.rstrip().split()
          findFunctions(line, i+1)
      i += 1

    print('\n\nNumber of function definitions found:', len(functionDeclarations))
    print('Duplicate function names:', duplicateFunctionNames)

if __name__ == "__main__":
  main()
