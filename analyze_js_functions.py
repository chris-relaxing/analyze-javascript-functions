#!python3

import sys
print('sys.version', sys.version)
print("Analyze JavaScript Functions")

#  Notes:
# ---------------------------------------------------
# Function definition patterns
# 1. Name + optional space + = + optional space + function + optional space + (
# goto_task = function(
# formatDateTime = function (

# 1. function + space + name + optional space + (
# function placeHeader(

# To do: ---------------------------

# Fix the case of: console.log('jones653 pressRunPopupActive=%s',get('pressRunPopupActive')); (resource_edit.js line 655)
#  This gives function call name of ',get

# Need to distinguish between
#  --helper functions,
#  --regular functions,
#  --event handlers, and
#  --anonymous functions
#  --function declarations vs function expressions
#  -- arrow functions: (results) =>


# ---------------------------------------------------

# Path to JavaScript file to parse
# jsFile = r"C:\Users\Chris Nielsen\Desktop\python\analyze-javascript-functions\test_files\resource_edit.js"    # large
# jsFile = r"C:\Users\Chris Nielsen\Desktop\python\analyze-javascript-functions\test_files\usertask.js"         # medium
# jsFile = r"C:\Users\Chris Nielsen\Desktop\python\analyze-javascript-functions\test_files\active_tasks.js"     # small
jsFile = r"C:\Users\Chris\Desktop\Projects\analyze-javascript-functions\test_files\resource_edit.js"
# jsFile = r"C:\Users\Chris\Desktop\Projects\analyze-javascript-functions\test_files\usertask.js"
# jsFile = r"C:\Users\Chris\Desktop\Projects\analyze-javascript-functions\test_files\active_tasks.js"

# Global tokens
space = " "
function = 'function'
leftParen = '('
rightParen = ')'
equalSign = '='
leftSquig = '{'
rightSquig = '}'

# These are JavaScript language functions and devices that use parenthesis
# Don't want to comingle these with code base function calls
JAVASCRIPT_KEYWORDS = [
    'getUTCDate', 'toString', 'isArray', 'parseFloat', 'getUTCMilliseconds', 'setUTCDate', 'setUTCMilliseconds', 'substr', 'String', 'getMilliseconds', 'toUTCString', 'setHours', 'getYear', 'setUTCFullYear', 'toLocaleTimeString', 'push', 'decodeURI', 'getFullYear', 'isFinite', 'getUTCMinutes', 'getUTCSeconds', 'toLocaleDateString', 'setMilliseconds', 'setUTCSeconds', 'slice', 'toTimeString', 'Number','&&', 'valueOf', 'isNaN', 'getMinutes', 'getMonth', 'toDate', 'getSeconds', 'getUTCFullYear', "'rgba", 'setYear', 'toDateString', 'setUTCMinutes', '$', 'setUTCMonth', 'getUTCDay', 'if', 'encodeURI', 'moment', 'rgba', '+', 'setUTCHours', 'toJSON', 'setMinutes', 'log', 'setSeconds', 'toISOString', 'Date', 'toLocaleString', 'getTimezoneOffset', 'getUTCHours', 'charAt', 'getHours', 'escape', 'setDate', 'eval', 'UTC', 'setTime', 'setFullYear', 'getTime', 'decodeURIComponent', 'substring', 'parseInt', '=', 'console.log', 'unescape', 'getUTCMonth', 'now', 'getDay', 'setMonth', 'getDate', 'for', 'toGMTString', 'parse', 'encodeURIComponent', 'sort', 'round', 'sprintf', 'IN', 'join', 'getAttribute', 'getElementById', 'getElementsByClassName', 'attr', 'replace', '<', '+=', '>', '>=', '<=', '-', '/', '*', 'typeof', 'indexOf', 'ceil', 'abs', 'toFixed', 'toUpperCase', 'toLowerCase', 'JSON.stringify', 'val', 'trim', 'is', 'includes', 'preventDefault', 'prop', 'switch', 'concat', 'splice', 'split', 'hasOwnProperty', 'removeAttr', 'find', 'Template.instance', 'setAttribute', 'css', 'offset', 'scrollTop', 'exec', 'addClass', 'removeClass', 'stopPropagation', 'prev', "'", 'focus', 'click', 'closest', 'show', 'hide', 'html', 'parent', 'each', 'change', 'position', 'height', 'width', 'search', 'fetch', 'Date.prototype.sameDay'
]


# Container for all function declaration information (names, args, lines)
functionDeclarations = []

# Container for all anonymous function declarations (lines, args)
anonymousFunctions = []

# Container for all anonymous function declarations (lines, args)
functionCalls = []

# List of all line numbers that are commented out
commentedLines = []
commentedLineRanges = []
commentRangeStart = ""
commentRangeEnd = ""

# This dicionary for checking for duplicate function names (keys)
functionNames = {}
duplicateFunctionNames = {}

# This dictionary is for looking up a function name given the starting line
functionNameStartLineLookup = {}

# This dictionary is for looking up a functionDeclarations index given a function name
functionDeclarationNameIndex = {}

# This dictionary contains counts for every function name. key=function name, value=count
functionCallCounts = {}

ex1 = 'const formatDateTime = function (isoDate){'

line = ex1.split()
# print("line:", line)

# ---------------------------------------------------
def getFunctionName(line):
    """Parse the line to return the function name"""
    # The original line has already been split by blank spaces. line passed in is a list.
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
        # functionName = line[functionIndex-1][:-1]
        functionName = " ".join(line).split(':')[0]
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
    try:
        rightSide = lparen[1]    #right side of the line contains the function args
        rparen = rightSide.split(')')
        functionArgs = rparen[0]
    except:
        rparen = []
        functionArgs = ""


    if functionArgs:
        print("Function args:", functionArgs)
        return functionArgs

# ---------------------------------------------------
def getFunctionBody(approxFunctionRanges):
    """Gather the function body as a string."""
    # Use this to collect function ranges also.
    y = 0
    for range in approxFunctionRanges:
        start = range[0]
        end   = range[1]
        print('\n\nstart:', start, 'end:', end-1)
        functionName = functionNameStartLineLookup[start]
        print('Function name:\t', functionName)

        i = start-1   # adjust for 0 based indexing
        funcOpen = 0
        funcClose = 0
        functionBody = ""
        functionBodyLineCount = 0
        while i < end-1:
            currLine = x[i]
            # print(currLine)

            findFunctionCalls(currLine, i+1, functionName)

            functionBody += currLine
            functionBodyLineCount += 1
            funcOpen += currLine.count(leftSquig)
            funcClose += currLine.count(rightSquig)
            if funcOpen == funcClose:
                # print('End of function found.')
                # print('Count {', funcOpen)
                # print('Count }', funcClose)
                break
            i += 1

        # Add the function body to the functionDeclarations dictionary with key 'functionBody'
        functionDeclarations[y]['functionBody'] = functionBody

        # Add the function body line count to functionDeclarations dictionary with key 'functionBodyLineCount'
        functionDeclarations[y]['functionBodyLineCount'] = functionBodyLineCount

        # Add the function body endLine to functionDeclarations dictionary with key 'endLine'
        endLine = functionBodyLineCount + start - 1
        functionDeclarations[y]['endLine'] = endLine

        y += 1

# ---------------------------------------------------
def findFunctionCalls(line, lineNumber, funcName):

    funcDefinitionLines = getFuncDefinitionLines()

    if lineNumber not in commentedLines:

        sq = "'"
        dq = '"'
        nonQuoteLine = ""
        quoteStack = []
        if sq in line or dq in line:
            for char in line:
                if char == sq:
                    # print('1', quoteStack)
                    if len(quoteStack) == 0:
                        # print('2', quoteStack)
                        quoteStack.append('s')
                    else:
                        if quoteStack[-1] == 's':
                            quoteStack.pop()
                            # print('3', quoteStack)
                        else:
                            quoteStack.append('s')
                            # print('4', quoteStack)

                elif char == dq:
                    # print('5', quoteStack)
                    if len(quoteStack) == 0:
                        quoteStack.append('d')
                        # print('6', quoteStack)
                    else:
                        if quoteStack[-1] == 'd':
                            quoteStack.pop()
                            # print('7', quoteStack)
                        else:
                            quoteStack.append('d')
                            # print('8', quoteStack)
                if len(quoteStack) == 0:
                    nonQuoteLine += char
            # print('nonQuoteLine', lineNumber, "\t", nonQuoteLine)
        else:
            nonQuoteLine = line
        # if lineNumber > 1561 and lineNumber < 1566:
        #     print('line', nonQuoteLine)

        # Count them in pairs? If the next one is a different kind, add 1, otherwise subtract 1, until reach zero
        # keep track of active, so we know what is 'different'. When two cancel each other in the middle, active reverts
        # need a 'stack' for this
        # https://docs.python.org/2/tutorial/datastructures.html#using-lists-as-stacks
        #  html += '<p><a href="#" onclick="javascript:$(\'#help_note\').hide();">Close</a></p>';


        #  Look for opening parenthesis
        if (leftParen in nonQuoteLine):
        # if (leftParen in line):
            lparenSplit = nonQuoteLine.split('(')
            # lparenSplit = line.split('(')
            # print('lparenSplit', lparenSplit, len(lparenSplit))
            # Last index in lparenSplit does not contain function call name

            j = 0
            while j < len(lparenSplit)-1:
                l = lparenSplit[j]
                # print('\t l is:', l)
                l = l.split()
                try:
                    funcCall = l[-1]
                except:
                    funcCall = ''

                # split the funcCall on the dot
                dotSplit = funcCall.split('.')

                # split the funcCall on leftSquig
                # Case of: startCycle = Meteor.setTimeout(function(){cycle();}, 5000)
                # should not become  ){cycle
                leftSquigSplit = funcCall.split(leftSquig)
                if len(leftSquigSplit) > 1:
                    funcCall = leftSquigSplit[-1]

                # Filter the function calls so that we have only those that are not part of the
                # function definition or part of JavaScript built-in functions or key words
                # -----------------------------------------------------

                # Skip if section is empty. For example:  ('00' + (date.getUTCMonth() + 1)).slice(-2) + '-' +
                if not funcCall:
                    pass

                # Get rid of the first instances of function because they are part of the function definition
                # For example: let get = function (n) { return Session.get(pre + n) };
                elif lineNumber in funcDefinitionLines and funcCall == 'function':
                    pass

                # Make sure this is not a function definition (alternate format)
                # For example: function SQLquery(queryString, callback) {
                elif lineNumber in funcDefinitionLines and len(l) >= 2 and l[-2] == 'function':
                    pass

                # Filter out function names that are JavaScript key words
                elif funcCall in JAVASCRIPT_KEYWORDS or dotSplit[-1] in JAVASCRIPT_KEYWORDS:
                    pass

                else:
                    # Clean ! from the front of some function names
                    if funcCall.startswith('!'):
                        funcCall = funcCall.lstrip('!')

                    # Clean [ from some function names that are in brackets
                    if '[' in funcCall:
                        funcCall = funcCall.split('[')[1]

                    print('\t', lineNumber, ' funcCall:', funcCall)
                    # Get the index of functionDeclarations we need to edit
                    insertIndex = functionDeclarationNameIndex[funcName]
                    if functionDeclarations[insertIndex]['functionCalls']:
                        functionDeclarations[insertIndex]['functionCalls'].append({'funcCall': funcCall, 'callLine': lineNumber})
                    else:
                        functionDeclarations[insertIndex]['functionCalls'] = [{ 'funcCall': funcCall, 'callLine': lineNumber}]


                    if funcCall == 'function':
                        anonymousFunctions.append({'line': lineNumber})

                    else:
                        functionCalls.append({
                            'name': funcCall,
                            'line': lineNumber
                        })

                j += 1


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
            # We've found a function!
            print("\n")
            print('Line:', lineNumber, line.rstrip())

            try:
                rightSide = lparen[1]    #right side of the line contains the function args
                rparen = rightSide.split(')')
                args = rparen[0]
            except:
                rparen = []
                args = ""


            functionName = getFunctionName(leftSide)
            functionArgs = getFunctionArgs(line)
            funcDetails = {
                'name'  : functionName,
                'args'  : functionArgs,
                'startLine'  : lineNumber,
                'functionCalls' : []
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

            # Since we've just found the beginning of a function definition, let's
            # also gather the function body
            # getFunctionBody(line)


# ---------------------------------------------------
def getFuncDefinitionLines():
    funcDefinitionLines = []
    for func in functionDeclarations:
        funcDefinitionLines.append(func['startLine'])
    return funcDefinitionLines

# ---------------------------------------------------
def identifyCommentLines(line, lineNumber):
    """Capture all individual commented lines (//) and comment line ranges (/* to */)"""
    global commentRangeStart, commentRangeEnd
    try:
        splitLine = line.split()
        # Identify comment lines that begin with //
        if splitLine[0].startswith('//'):
            commentedLines.append(lineNumber);

        # # Also need to detect comment blocks that start with /* and end with */
        if splitLine[0].startswith('/*'):
            commentRangeStart = lineNumber
            print('\tFound START of comment range!', lineNumber)
        if '*/' in line:
            commentRangeEnd = lineNumber
            print('\tFound END of comment range!', lineNumber)
            if commentRangeStart and commentRangeEnd:
                commentRange = (commentRangeStart, commentRangeEnd)
                commentedLineRanges.append(commentRange)
                commentRange = ()
                commentRangeStart = ""
                commentRangeEnd = ""
    except:
        pass

# ---------------------------------------------------
def addCommentRangesToCommentedLines():
    """Add all comment line ranges as individual line numbers to commentedLines list."""
    for tup in commentedLineRanges:
        # print('\naddCommentRangesToCommentedLines:')
        start = tup[0]
        end = tup[1]
        diff = end - start
        x = 0
        while x < diff+1:
            # print(start + x)
            commentedLines.append(start + x)
            x += 1


# ---------------------------------------------------

def main():
    # Reading of the JavaScript file - work on after perfecting pattern detection
    print("Reading file:", jsFile)
    global x

    with open(jsFile, 'r') as js:
      x = js.readlines()

    # print('type', type(x))
    # print('length', len(x))
    fileLength = len(x)

    # Iterate over all lines to get function definition info
    i = 0
    for line in x:
      if(i < fileLength):
          findFunctions(line, i+1)
          identifyCommentLines(line, i+1)
      i += 1

    # Take all of the comment ranges and add individual lines to commentedLines
    addCommentRangesToCommentedLines()
    commentedLines.sort()

    print('\n\nNumber of function definitions found:', len(functionDeclarations))
    print('Duplicate function names:', duplicateFunctionNames)

    # Create function line ranges
    i = 0
    approxFunctionRanges = []
    while i < len(functionDeclarations):
        eof = len(x)+1
        funcStart = functionDeclarations[i]['startLine']
        try:
            funcEnd = functionDeclarations[i+1]['startLine']
        except:
            funcEnd = eof
        rangeTuple = (funcStart, funcEnd)
        approxFunctionRanges.append(rangeTuple)
        i += 1

    print('approxFunctionRanges', approxFunctionRanges)

    # Create a lookup dictionary where the keys are function starting lines and the values are function names
    index = 0
    for func in functionDeclarations:
        funcName =  func['name']
        funcStart = func['startLine']
        functionNameStartLineLookup[funcStart] = funcName
        # Create a lookup dictionary where the keys are function names and the values are the index in functionDeclarations
        functionDeclarationNameIndex[funcName] = index
        index += 1

    print('\nfunctionNameStartLineLookup:', functionNameStartLineLookup)
    print('\nfunctionDeclarationNameIndex:', functionDeclarationNameIndex)

    # Get function bodies (this also calls findFunctionCalls )
    getFunctionBody(approxFunctionRanges)

    funcDeclarationNames = []
    for func in functionDeclarations:
        funcDeclarationNames.append(func['name'])


    # print(functionDeclarations[-2]['functionBody'])

    print('\nfunctionDeclarations', funcDeclarationNames, len(funcDeclarationNames))

    print('\nanonymousFunctions', anonymousFunctions, len(anonymousFunctions))

    # print('\nfunctionCalls', functionCalls, len(functionCalls))

    print('\ncommentedLines', commentedLines, len(commentedLines))

    print('\ncommentedLineRanges', commentedLineRanges, len(commentedLineRanges))

    print('\nfunctionDeclarations.keys()', functionDeclarations[0].keys(), len(functionDeclarations[0].keys()))

    functionAnalysisNumberLines = []
    runningTotal = 0
    for func in functionDeclarations:
        numLines =  func['functionBodyLineCount']
        runningTotal += numLines
        functionAnalysisNumberLines.append(numLines)

    functionAnalysisNumberLinesAverage =  runningTotal / len(functionAnalysisNumberLines)

    print('\nLongest Function in this file:', max(functionAnalysisNumberLines))
    print('\nAvergage number of lines per function:', round(functionAnalysisNumberLinesAverage))



    # for func in functionDeclarations:
    #     print('\n\tFunction name:', func['name'] )
    #     print('\tFunction arguments:', func['args'] )
    #     print('\tStarts on line:', func['startLine'] )
    #     print('\tEnds on line:', func['endLine'] )
    #     print('\tNumber of lines:', func['functionBodyLineCount'] )

    # Load up functionCallCounts
    for func in functionDeclarations:
        funcName = func['name']
        print('\n\tFunction name:', funcName )
        print('\tFunction calls:\n')
        for elem in func['functionCalls']:
            funcCall = elem['funcCall']
            print('\t\t', elem['callLine'], '\t', funcCall)

            if funcCall not in functionCallCounts.keys():
                functionCallCounts[funcCall] = 1
            else:
                functionCallCounts[funcCall] += 1


    print('\nFunction call counts:', functionCallCounts, len(functionCallCounts))
    maxFuncCalls = max(functionCallCounts, key=lambda k: functionCallCounts[k])
    minFuncCalls = min(functionCallCounts, key=lambda k: functionCallCounts[k])
    print('\nThe function called the most is:', maxFuncCalls, "with", functionCallCounts[maxFuncCalls])
    print('The function called the least is:', minFuncCalls, "with", functionCallCounts[minFuncCalls])

if __name__ == "__main__":
  main()
