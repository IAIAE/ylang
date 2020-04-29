# this
Ylang是一个前端javascript打包器，也可以认为是“微前端”的一种落地实现。它基于webpack，在此基础上提供了沙箱环境，进而落地“微前端”。注意它只针对浏览器环境下的js工程使用，不适用于nodejs工程。

到底什么是“微前端”呢？这个话题不得不在这里讨论一下。todo

# usage
包含了两个npm包，runtime里面是[ylang-runtime](https://github.com/IAIAE/ylang/tree/master/runtime)，而packer里面是[ylang](https://github.com/IAIAE/ylang/tree/master/packer)。

请点击链接查看子文档

# 注意

**只能在mac\linux环境使用，因为目前path判断是用uinx形式的“/”，没有支持windows上的c:\\情况**