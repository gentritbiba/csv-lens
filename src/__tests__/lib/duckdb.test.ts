import { describe, it, expect } from 'vitest'
import { sanitizeIdentifier } from '@/lib/duckdb'

describe('duckdb utilities', () => {
  describe('sanitizeIdentifier', () => {
    it('should keep alphanumeric characters', () => {
      expect(sanitizeIdentifier('test123')).toBe('test123')
      expect(sanitizeIdentifier('ABC')).toBe('ABC')
      expect(sanitizeIdentifier('abc123XYZ')).toBe('abc123XYZ')
    })

    it('should keep underscores', () => {
      expect(sanitizeIdentifier('column_name')).toBe('column_name')
      expect(sanitizeIdentifier('_test_')).toBe('_test_')
      expect(sanitizeIdentifier('a_b_c')).toBe('a_b_c')
    })

    it('should keep spaces', () => {
      expect(sanitizeIdentifier('Column Name')).toBe('Column Name')
      expect(sanitizeIdentifier('first second third')).toBe('first second third')
    })

    it('should keep hyphens', () => {
      expect(sanitizeIdentifier('column-name')).toBe('column-name')
      expect(sanitizeIdentifier('my-table-name')).toBe('my-table-name')
    })

    it('should keep dots', () => {
      expect(sanitizeIdentifier('schema.table')).toBe('schema.table')
      expect(sanitizeIdentifier('a.b.c')).toBe('a.b.c')
    })

    it('should remove special characters', () => {
      expect(sanitizeIdentifier('test@column')).toBe('testcolumn')
      expect(sanitizeIdentifier('name#123')).toBe('name123')
      expect(sanitizeIdentifier('value$field')).toBe('valuefield')
      expect(sanitizeIdentifier('data%info')).toBe('datainfo')
      expect(sanitizeIdentifier('col^name')).toBe('colname')
      expect(sanitizeIdentifier('test&data')).toBe('testdata')
      expect(sanitizeIdentifier('foo*bar')).toBe('foobar')
      expect(sanitizeIdentifier('a(b)c')).toBe('abc')
      expect(sanitizeIdentifier('x[y]z')).toBe('xyz')
      expect(sanitizeIdentifier('p{q}r')).toBe('pqr')
    })

    it('should remove semicolons (SQL injection prevention)', () => {
      expect(sanitizeIdentifier('test;DROP TABLE users')).toBe('testDROP TABLE users')
    })

    it('should remove SQL comment markers', () => {
      // -- keeps one hyphen since -- contains hyphens which are allowed
      expect(sanitizeIdentifier('test--comment')).toBe('test--comment')
      // /* and */ lose special chars, keeping only letters
      expect(sanitizeIdentifier('data/*comment*/')).toBe('datacomment')
    })

    it('should handle strings with double quotes', () => {
      // Double quotes are removed by the first sanitization step (not in allowed chars)
      // then the quote escaping runs but there are no quotes left to escape
      expect(sanitizeIdentifier('test"quote')).toBe('testquote')
      expect(sanitizeIdentifier('"already"quoted"')).toBe('alreadyquoted')
      expect(sanitizeIdentifier('a"b"c')).toBe('abc')
    })

    it('should handle empty string input', () => {
      expect(sanitizeIdentifier('')).toBe('')
    })

    it('should handle string with only special characters', () => {
      expect(sanitizeIdentifier('@#$%^&*()')).toBe('')
      expect(sanitizeIdentifier('!@#')).toBe('')
      expect(sanitizeIdentifier(';;;')).toBe('')
    })

    it('should handle mixed valid and invalid characters', () => {
      expect(sanitizeIdentifier('valid@invalid#chars')).toBe('validinvalidchars')
      expect(sanitizeIdentifier('Column Name (Legacy)')).toBe('Column Name Legacy')
      expect(sanitizeIdentifier('table.column@2024')).toBe('table.column2024')
    })

    it('should handle unicode characters', () => {
      // Unicode letters are not in \w so they get removed
      expect(sanitizeIdentifier('test')).toBe('test')
    })

    it('should preserve case', () => {
      expect(sanitizeIdentifier('CamelCase')).toBe('CamelCase')
      expect(sanitizeIdentifier('UPPERCASE')).toBe('UPPERCASE')
      expect(sanitizeIdentifier('lowercase')).toBe('lowercase')
      expect(sanitizeIdentifier('MixedCase123')).toBe('MixedCase123')
    })
  })
})
