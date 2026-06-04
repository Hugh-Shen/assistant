async function main() {
  const content = [
    '# 对付傻逼公司的方法',
    '',
    '1. 使用拖字诀',
  ].join('\n')

  const formData = new FormData()
  formData.append(
    'file',
    new File([Buffer.from(content, 'utf8')], 'document-upload-test.md', {
      type: 'text/markdown',
    }),
  )

  const response = await fetch('http://127.0.0.1:3001/api/documents/upload', {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'x-response-mode': 'json',
    },
    body: formData,
  })

  const text = await response.text()

  console.log(
    JSON.stringify(
      {
        ok: response.ok,
        status: response.status,
        statusText: response.statusText,
        contentType: response.headers.get('content-type'),
        body: tryParseJson(text),
        rawBody: text,
      },
      null,
      2,
    ),
  )
}

function tryParseJson(value: string) {
  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}

main().catch(error => {
  console.error('[document-upload-test-error]', error)
  process.exitCode = 1
})
