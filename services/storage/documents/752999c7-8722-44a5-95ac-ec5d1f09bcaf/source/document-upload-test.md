# Document Upload Test

这个测试文件用于验证 documents/upload 接口是否可以正常接收 markdown 文件。

- 应该成功通过 multer 解析
- 应该成功通过 DocumentFileValidationPipe 校验
- 应该成功进入文档处理流程