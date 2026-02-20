/*
Storage helper functions
*/

import { createClient } from '@supabase/supabase-js'
import { gunzip } from 'zlib'
import { promisify } from 'util'

const gunzipAsync = promisify(gunzip)

export const supabaseAdmin = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY || ''
)

// Upload the similarity matrix CSV file to Supabase Storage
export async function uploadSimilarities(fileData: Buffer, fileName: string = 'similarities.csv') {
  const contentType = fileName.endsWith('.gz') ? 'application/gzip' : 'text/csv'
  const { data, error } = await supabaseAdmin.storage.from('ml-data').upload(fileName, fileData, {
    contentType,
    upsert: true,
  })

  if (error) {
    throw createError({
      statusCode: 500,
      message: `Failed to upload similarities file. Message: ${error.message}`,
    })
  }

  return data
}

// Download the similarity matrix CSV file from Supabase Storage
export async function downloadSimilarities(fileName: string = 'similarities.csv') {
  const { data, error } = await supabaseAdmin.storage.from('ml-data').download(fileName)

  if (error) {
    throw createError({
      statusCode: 500,
      message: `Failed to download similarities file. Message: ${error.message}`,
    })
  }

  // Decompress gzip data if the file is gzipped
  try {
    if (fileName.endsWith('.gz')) {
      const decompressed = await gunzipAsync(Buffer.from(await data.arrayBuffer()))
      return decompressed
    }
    return data
  } catch (decompressError) {
    throw createError({
      statusCode: 500,
      message: `Failed to decompress similarities file. Message: ${decompressError}`,
    })
  }
}

// Get file info
export async function getSimilarityFileInfo(fileName: string = 'similarities.csv.gz') {
  const { data, error } = await supabaseAdmin.storage.from('ml-data').list('', {
    limit: 100,
    offset: 0,
  })

  if (error) {
    throw createError({
      statusCode: 500,
      message: `Failed to list files in storage. Message: ${error.message}`,
    })
  }

  const file = data.find((f) => f.name === fileName)

  return file || null
}
