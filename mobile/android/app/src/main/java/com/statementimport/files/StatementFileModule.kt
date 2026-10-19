package com.statementimport.files

import android.net.Uri
import android.provider.OpenableColumns
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.WritableArray
import com.facebook.react.bridge.WritableMap
import java.io.File
import java.io.FileInputStream
import java.io.FileOutputStream
import java.io.IOException
import java.net.HttpURLConnection
import java.net.SocketTimeoutException
import java.net.URL
import java.util.UUID
import java.util.concurrent.Executors

private const val HEAD_BYTES = 32
private const val COPY_BUFFER_BYTES = 64 * 1024

/**
 * Streaming copy of a picked file into a private, no-backup directory with a
 * hard size cap, upload straight from that file, and cleanup. All I/O runs on
 * a background executor, never the JS thread. Error codes only — never a
 * path, file name, or byte content reaches a rejected promise's message.
 */
class StatementFileModule(reactContext: ReactApplicationContext) :
  NativeStatementFileSpec(reactContext) {

  private val executor = Executors.newSingleThreadExecutor()

  private val importsDir: File by lazy {
    File(reactApplicationContext.noBackupFilesDir, "imports").apply { mkdirs() }
  }

  override fun stage(sourceUri: String, opId: String, maxBytes: Double, promise: Promise) {
    executor.execute {
      val limit = maxBytes.toLong()
      val uri = Uri.parse(sourceUri)
      val resolver = reactApplicationContext.contentResolver
      val partFile = File(importsDir, "$opId.bin.part")
      val finalFile = File(importsDir, "$opId.bin")

      try {
        queryDeclaredSize(uri)?.let { declared ->
          if (declared > limit) {
            promise.reject("E_TOO_LARGE", "declared size exceeds limit")
            return@execute
          }
        }

        val input = try {
          resolver.openInputStream(uri)
        } catch (e: Exception) {
          null
        } ?: run {
          promise.reject("E_UNREADABLE", "could not open input stream")
          return@execute
        }

        var total = 0L
        input.use { stream ->
          FileOutputStream(partFile).use { out ->
            val buffer = ByteArray(COPY_BUFFER_BYTES)
            while (true) {
              val read = stream.read(buffer)
              if (read < 0) break
              total += read
              if (total > limit) {
                partFile.delete()
                promise.reject("E_TOO_LARGE", "stream exceeded limit")
                return@execute
              }
              out.write(buffer, 0, read)
            }
          }
        }

        if (total == 0L) {
          partFile.delete()
          promise.reject("E_EMPTY", "file is empty")
          return@execute
        }

        partFile.renameTo(finalFile)

        val head = ByteArray(HEAD_BYTES)
        val headRead = FileInputStream(finalFile).use { it.read(head) }.coerceAtLeast(0)

        val result: WritableMap = Arguments.createMap()
        result.putString("path", finalFile.absolutePath)
        result.putDouble("size", total.toDouble())
        val headArray: WritableArray = Arguments.createArray()
        for (i in 0 until headRead) headArray.pushInt(head[i].toInt() and 0xFF)
        result.putArray("head", headArray)
        promise.resolve(result)
      } catch (e: Exception) {
        partFile.delete()
        promise.reject("E_IO", "staging failed")
      }
    }
  }

  private fun queryDeclaredSize(uri: Uri): Long? {
    return try {
      reactApplicationContext.contentResolver
        .query(uri, arrayOf(OpenableColumns.SIZE), null, null, null)
        ?.use { cursor ->
          if (cursor.moveToFirst()) {
            val index = cursor.getColumnIndex(OpenableColumns.SIZE)
            if (index >= 0 && !cursor.isNull(index)) cursor.getLong(index) else null
          } else null
        }
    } catch (e: Exception) {
      null
    }
  }

  override fun upload(url: String, path: String, headers: ReadableMap, timeoutMs: Double, promise: Promise) {
    executor.execute {
      val file = File(path)
      var connection: HttpURLConnection? = null
      try {
        connection = (URL(url).openConnection() as HttpURLConnection).apply {
          requestMethod = "POST"
          doOutput = true
          connectTimeout = timeoutMs.toInt()
          readTimeout = timeoutMs.toInt()
          setFixedLengthStreamingMode(file.length())
          val iterator = headers.keySetIterator()
          while (iterator.hasNextKey()) {
            val key = iterator.nextKey()
            setRequestProperty(key, headers.getString(key))
          }
        }

        FileInputStream(file).use { input ->
          connection.outputStream.use { output ->
            val buffer = ByteArray(COPY_BUFFER_BYTES)
            while (true) {
              val read = input.read(buffer)
              if (read < 0) break
              output.write(buffer, 0, read)
            }
          }
        }

        val status = connection.responseCode
        val stream = if (status in 200..299) connection.inputStream else connection.errorStream
        val body = stream?.bufferedReader()?.use { it.readText() } ?: ""

        val result: WritableMap = Arguments.createMap()
        result.putInt("status", status)
        result.putString("body", body)
        promise.resolve(result)
      } catch (e: SocketTimeoutException) {
        promise.reject("E_TIMEOUT", "upload timed out")
      } catch (e: IOException) {
        promise.reject("E_NETWORK", "upload failed")
      } finally {
        connection?.disconnect()
      }
    }
  }

  override fun remove(path: String, promise: Promise) {
    executor.execute {
      try {
        File(path).delete()
        promise.resolve(null)
      } catch (e: Exception) {
        promise.reject("E_IO", "remove failed")
      }
    }
  }

  override fun sweep(keepPaths: ReadableArray, promise: Promise) {
    executor.execute {
      try {
        val keep = HashSet<String>()
        for (i in 0 until keepPaths.size()) keepPaths.getString(i)?.let { keep.add(it) }
        var removed = 0
        importsDir.listFiles()?.forEach { file ->
          if (!keep.contains(file.absolutePath)) {
            if (file.delete()) removed += 1
          }
        }
        promise.resolve(removed)
      } catch (e: Exception) {
        promise.reject("E_IO", "sweep failed")
      }
    }
  }

  override fun randomKey(): String = UUID.randomUUID().toString()

  companion object {
    const val NAME = NativeStatementFileSpec.NAME
  }
}
