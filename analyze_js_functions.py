
print("Analyze JavaScript Functions")

# Function definition patterns
# 1. Name + optional space + = + optional space + function + optional space + (
# goto_task = function(
# formatDateTime = function (

# 1. function + space + name + optional space + (
# function placeHeader(

# .js path
# jsFile = r"C:\Users\Chris Nielsen\Desktop\odyssey\client\resources\resource_edit.js"
jsFile = r"C:\Users\Chris Nielsen\Desktop\python\analyze-javascript-functions\test_files\active_tasks.js"

space = " "
function = "function"
leftParen = "("
rightParen = ")"
equalSign = '='

ex1 = 'const formatDateTime = function (isoDate){'

line = ex1.split()
# print("line:", line)

# ---------------------------------------------------
def getFunctionName(line):
    """Parse the line to return the function name"""
    # print(line.index(function))
    functionName = ""
    functionIndex = line.index(function)

    #  Pattern: formatDateTime = function
    if line[functionIndex-1] == equalSign:
        functionName = line[functionIndex-2]
        print('functionName:', functionName)

    #  Pattern: formatDateTime: function
    if line[functionIndex-1][-1] == ':':
        functionName = line[functionIndex-1][:-1]
        print('functionName:', functionName)

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

    #  Case of spaces in the function parenthesis (n, v)
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

            getFunctionName(leftSide)
            getFunctionArgs(line)







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
          # if (leftParen in parsedLine):
          #     print(i, ":", parsedLine)
      i += 1


if __name__ == "__main__":
  main()
