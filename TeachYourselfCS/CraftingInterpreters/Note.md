# [Crafting Interpreters](https://craftinginterpreters.com/contents.html)
## Table
- Part I. Welcome
  1. Introduction (What’s in a Name?
  2. A Map of the Territory
  3. The Lox Language (Expressions and Statements

- Part II. A Tree-Walk Interpreter
  1. Scanning (Implicit Semicolons
  2. Representing Code
  3. Parsing Expressions (Logic Versus History
  4. Evaluating Expressions (Static and Dynamic Typing
  5. Statements and State (Implicit Variable Declaration
  6. Control Flow (Spoonfuls of Syntactic Sugar
  7. Functions
  8. Resolving and Binding
  9. Classes (Prototypes and Power
  10. Inheritance

- Part III. A Bytecode Virtual Machine
  1. Chunks of Bytecode -(Test Your Language
  2. A Virtual Machine (Register-Based Bytecode
  3. Scanning on Demand
  4. Compiling Expressions (It’s Just Parsing
  5. Types of Values
  6. Strings (String Encoding
  7. Hash Tables
  8. Global Variables
  9. Local Variables
  10. Jumping Back and Forth (Considering Goto Harmful
  11. Calls and Functions
  12. Closures (Closing Over the Loop Variable
  13. Garbage Collection (Generational Collectors
  14. Classes and Instances
  15. Methods and Initializers (Novelty Budget
  16. Superclasses
  17. Optimization

- Part X. Backmatter
  1. Appendix I: Lox Grammar
  2. Appendix II: Generated Syntax Tree Classes

## Book
### Introduction
+ 什么是Interpreters？Compiler的区别是什么？
+ 本书涉及到两种语言，JAVA和C
+ 学习解释器还会加深对于数据和算法的理解
+ 对于无知和敬仰
+ FORTRAN 77 - 较早的高级语言设计标准
+ self-hosting, bootstrapping

### A Map of the Territory
+ front - middle - back
> 理解 - 整理与优化 - 生成或执行
+ Front End:
  + scanning/lexing(token)
  + parsing(AST,syntax)
  + static analysis(type, scope)
+ store place: attributes, symbol table, new data structure
+ Middle End:
  + IR - intermediate representation
  + GNU Compiler Collection 
  + Optimization(constant folding)
+ Back End:
  + code generation - native / virtual machine code
  + bytecode & VM
  + Runtime
+ Shortcuts
  + AOT - ahead of time 原生编译
  + single-pass compiler
  + tree-walk interpreter
  + transpiler
  + just-in-time compilation
+ Compilers & Interpreters
  + 编译器是将代码转化为另外一种不可执行代码
  + 解释器是着将代码需要为可执行代码

=> 