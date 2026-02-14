export default defineEventHandler(async (event) => {
  // admin is already authenticated by middleware

  const formData = await readMultipartFormData(event)

  if (!formData || formData.length === 0) {
    throw createError({
      statusCode: 400,
      message: 'No file uploaded',
    })
  }

  const file = formData[0]

  if (!file || !file.data || !file.filename) {
    throw createError({
      statusCode: 400,
      message: 'Invalid file upload',
    })
  }

  const allowedTypes = ['text/csv', 'application/json']
  if (file.type && !allowedTypes.includes(file.type)) {
    throw createError({
      statusCode: 400,
      message: 'Unsupported file type. Please upload a CSV or JSON file.',
    })
  }

  const fileSizeMB = file.data.length / (1024 * 1024)

  try {
    const { uploadSimilarities } = await import('../../utils/storage')

    const result = await uploadSimilarities(file.data, file.filename)

    console.log(`File uploaded successfully: ${result.path}, size: ${fileSizeMB.toFixed(2)} MB`)

    return {
      success: true,
      message: 'Similarities uploaded successfully',
      file: {
        name: file.filename,
        size: fileSizeMB.toFixed(2) + ' MB',
        path: result.path,
        bucket: 'ml-data',
      },
    }
  } catch (error) {
    console.error('Error uploading file:', error)
    throw createError({
      statusCode: 500,
      message: 'Failed to upload file. Please try again later.',
    })
  }
})
